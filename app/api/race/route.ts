import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPointsForPosition } from '@/lib/utils'

type AnyTable = ReturnType<Awaited<ReturnType<typeof createClient>>['from']>
// Helper to cast supabase table query
function tb(supabase: Awaited<ReturnType<typeof createClient>>, table: string): AnyTable {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(table)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { action, sessionId, eventId, categoryId } = body as {
    action: string
    sessionId?: string
    eventId?: string
    categoryId?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }

  try {
    switch (action) {
      case 'START_RACE': {
        if (!categoryId || !eventId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

        const { data: cat } = await tb(supabase, 'event_categories')
          .select('voting_duration_seconds, lap_count')
          .eq('id', categoryId)
          .single()

        const catTyped = cat as { voting_duration_seconds: number; lap_count: number } | null
        if (!catTyped) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

        const nowIso = new Date().toISOString()
        const { data: session } = await tb(supabase, 'race_sessions')
          .upsert({
            event_id: eventId,
            event_category_id: categoryId,
            state: 'LIGHTS_1',
            flag: 'NONE',
            current_lap_number: 1,
            started_at: nowIso,
          }, { onConflict: 'event_category_id' })
          .select()
          .single()

        const sessionTyped = session as { id: string } | null
        if (!sessionTyped) return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })

        await tb(supabase, 'events').update({
          current_category_id: categoryId,
          status: 'LIVE',
        }).eq('id', eventId)

        return NextResponse.json({
          success: true,
          session: sessionTyped,
          duration: catTyped.voting_duration_seconds,
          startedAt: nowIso,
        })
      }

      case 'SET_STATE': {
        if (!sessionId || !body.state) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
        const updateData: Record<string, unknown> = { state: body.state }
        if (body.flag) updateData.flag = body.flag
        await tb(supabase, 'race_sessions').update(updateData).eq('id', sessionId)
        return NextResponse.json({ success: true })
      }

      case 'OPEN_VOTING': {
        if (!sessionId || !categoryId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

        const { data: cat } = await tb(supabase, 'event_categories')
          .select('voting_duration_seconds')
          .eq('id', categoryId)
          .single()

        const duration = (cat as { voting_duration_seconds: number } | null)?.voting_duration_seconds ?? 30
        const votingEndsAt = new Date(Date.now() + duration * 1000).toISOString()

        const { data: sessData } = await tb(supabase, 'race_sessions').select('current_lap_number').eq('id', sessionId).single()
        const lapNum = (sessData as { current_lap_number: number } | null)?.current_lap_number ?? 1

        const { data: existingLap } = await tb(supabase, 'laps')
          .select('id')
          .eq('event_category_id', categoryId)
          .eq('lap_number', lapNum)
          .maybeSingle()

        const existingLapTyped = existingLap as { id: string } | null

        if (!existingLapTyped) {
          await tb(supabase, 'laps').insert({
            event_category_id: categoryId,
            lap_number: lapNum,
            status: 'VOTING',
            started_at: new Date().toISOString(),
            voting_opened_at: new Date().toISOString(),
            voting_ends_at: votingEndsAt,
          })
        } else {
          await tb(supabase, 'laps').update({
            status: 'VOTING',
            voting_opened_at: new Date().toISOString(),
            voting_ends_at: votingEndsAt,
          }).eq('id', existingLapTyped.id)
        }

        await tb(supabase, 'race_sessions').update({
          state: 'VOTING',
          flag: 'GREEN',
          voting_ends_at: votingEndsAt,
        }).eq('id', sessionId)

        return NextResponse.json({ success: true, votingEndsAt })
      }

      case 'SET_FLAG': {
        if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
        await tb(supabase, 'race_sessions').update({ flag: body.flag }).eq('id', sessionId)
        return NextResponse.json({ success: true })
      }

      case 'CLOSE_VOTING': {
        if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
        await tb(supabase, 'race_sessions').update({ state: 'VOTING_CLOSED', flag: 'NONE' }).eq('id', sessionId)
        if (categoryId && body.lapNumber) {
          await tb(supabase, 'laps').update({
            status: 'CLOSED',
            voting_closed_at: new Date().toISOString(),
          }).eq('event_category_id', categoryId).eq('lap_number', body.lapNumber)
        }
        return NextResponse.json({ success: true })
      }

      case 'REVEAL_RESULT': {
        if (!sessionId || !categoryId || !body.lapId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

        const { data: votes } = await tb(supabase, 'votes')
          .select('candidate_id')
          .eq('lap_id', body.lapId)

        if (!votes) return NextResponse.json({ error: 'No votes found' }, { status: 404 })

        const votesTyped = votes as { candidate_id: string }[]
        const counts: Record<string, number> = {}
        votesTyped.forEach((v) => { counts[v.candidate_id] = (counts[v.candidate_id] ?? 0) + 1 })

        const { data: candidates } = await tb(supabase, 'event_category_candidates')
          .select('id')
          .eq('event_category_id', categoryId)

        if (!candidates) return NextResponse.json({ error: 'No candidates' }, { status: 404 })

        const candidatesTyped = candidates as { id: string }[]
        const ranked = candidatesTyped
          .map((c) => ({ id: c.id, votes: counts[c.id] ?? 0 }))
          .sort((a, b) => b.votes - a.votes)

        const { data: cat } = await tb(supabase, 'event_categories')
          .select('scoring_config')
          .eq('id', categoryId)
          .single()

        const scoringConfig = ((cat as { scoring_config: Record<string, number> } | null)?.scoring_config) ?? {}

        const resultsToInsert = ranked.map((r, i) => ({
          lap_id: body.lapId,
          event_category_id: categoryId,
          candidate_id: r.id,
          vote_count: r.votes,
          position: i + 1,
          points_earned: getPointsForPosition(i + 1, scoringConfig),
        }))

        await tb(supabase, 'lap_results').upsert(resultsToInsert, { onConflict: 'lap_id,candidate_id' })

        // Update championship points
        for (const r of resultsToInsert) {
          const { data: existing } = await tb(supabase, 'championship_points')
            .select('id, total_points')
            .eq('event_category_id', categoryId)
            .eq('candidate_id', r.candidate_id)
            .maybeSingle()

          const existingTyped = existing as { id: string; total_points: number } | null

          if (existingTyped) {
            await tb(supabase, 'championship_points')
              .update({ total_points: existingTyped.total_points + r.points_earned })
              .eq('id', existingTyped.id)
          } else {
            await tb(supabase, 'championship_points').insert({
              event_id: body.eventId ?? eventId,
              event_category_id: categoryId,
              candidate_id: r.candidate_id,
              total_points: r.points_earned,
            })
          }
        }

        await tb(supabase, 'race_sessions').update({ state: 'RESULT_REVEAL' }).eq('id', sessionId)
        return NextResponse.json({ success: true })
      }

      case 'NEXT_LAP': {
        if (!sessionId || !categoryId || !body.lapNumber || !body.totalLaps) {
          return NextResponse.json({ error: 'Missing params' }, { status: 400 })
        }

        const nextLap = body.lapNumber + 1

        if (nextLap > body.totalLaps) {
          await tb(supabase, 'race_sessions').update({ state: 'FINAL_RESULTS' }).eq('id', sessionId)
          return NextResponse.json({ success: true, done: true })
        }

        await tb(supabase, 'laps').update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
        }).eq('event_category_id', categoryId).eq('lap_number', body.lapNumber)

        await tb(supabase, 'race_sessions').update({
          state: 'LIGHTS_1',
          current_lap_number: nextLap,
          flag: 'NONE',
          started_at: new Date().toISOString(),
        }).eq('id', sessionId)

        return NextResponse.json({ success: true, nextLap })
      }

      case 'SHOW_PODIUM': {
        if (!sessionId || !categoryId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
        await tb(supabase, 'race_sessions').update({ state: 'PODIUM', flag: 'CHEQUERED' }).eq('id', sessionId)
        await tb(supabase, 'event_categories').update({ status: 'COMPLETED' }).eq('id', categoryId)
        return NextResponse.json({ success: true })
      }

      case 'END_RACE': {
        if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
        await tb(supabase, 'race_sessions').update({ state: 'CHEQUERED_FLAG', flag: 'CHEQUERED' }).eq('id', sessionId)
        if (eventId) {
          await tb(supabase, 'events').update({ status: 'COMPLETED', current_category_id: null }).eq('id', eventId)
        }
        return NextResponse.json({ success: true })
      }

      case 'RESET_LAP': {
        if (!sessionId || !categoryId || !body.lapNumber) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
        const { data: lap } = await tb(supabase, 'laps')
          .select('id')
          .eq('event_category_id', categoryId)
          .eq('lap_number', body.lapNumber)
          .maybeSingle()

        const lapTyped = lap as { id: string } | null
        if (lapTyped) {
          await tb(supabase, 'votes').delete().eq('lap_id', lapTyped.id)
          await tb(supabase, 'lap_results').delete().eq('lap_id', lapTyped.id)
          await tb(supabase, 'laps').delete().eq('id', lapTyped.id)
        }

        await tb(supabase, 'race_sessions').update({ state: 'READY', flag: 'NONE' }).eq('id', sessionId)
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    console.error('[Race Control API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
