'use client'

type ReflectionTask = {
  title: string
  description?: string
  estimated_mins: number
  done: boolean
  planned_start_time?: string | null
  planned_end_time?: string | null
  goal_detail?: {
    title?: string
  } | null
}

type ReflectionModalProps = {
  task: ReflectionTask | null
  note: string
  wentWell: string
  missed: string
  actualMins: number | string
  saving: boolean
  onClose: () => void
  onNoteChange: (value: string) => void
  onWentWellChange: (value: string) => void
  onMissedChange: (value: string) => void
  onActualMinsChange: (value: string) => void
  onSaveOnly: () => void
  onMarkDone: () => void
}

export default function ReflectionModal({
  task,
  note,
  wentWell,
  missed,
  actualMins,
  saving,
  onClose,
  onNoteChange,
  onWentWellChange,
  onMissedChange,
  onActualMinsChange,
  onSaveOnly,
  onMarkDone,
}: ReflectionModalProps) {
  if (!task) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: 16,
          padding: '20px 20px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxHeight: 'min(85vh, calc(100vh - 32px))',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: '#444',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              marginBottom: 6,
            }}
          >
            {task.goal_detail?.title ?? 'task'}
          </div>
          <div
            style={{
              fontSize: 20,
              color: '#e8e4dc',
              fontWeight: 400,
              lineHeight: 1.3,
              letterSpacing: '-.01em',
            }}
          >
            {task.title}
          </div>
          {task.description ? (
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginTop: 8 }}>
              {task.description}
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            {task.planned_start_time && task.planned_end_time ? (
              <span style={{ fontSize: 12, color: '#333' }}>
                {task.planned_start_time.slice(0, 5)} – {task.planned_end_time.slice(0, 5)}
              </span>
            ) : null}
            <span style={{ fontSize: 12, color: '#333' }}>{task.estimated_mins}m planned</span>
          </div>
        </div>

        <div style={{ height: 1, background: '#1e1e1e' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div
              style={{
                fontSize: 11,
                color: '#555',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                marginBottom: 6,
              }}
            >
              how did it go?
            </div>
            <textarea
              value={note}
              onChange={e => onNoteChange(e.target.value)}
              placeholder="what happened?"
              rows={2}
              style={{
                width: '100%',
                background: '#0f0f0f',
                border: '1px solid #1e1e1e',
                borderRadius: 8,
                padding: '9px 10px',
                fontSize: 13,
                color: '#e8e4dc',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: '#555',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                marginBottom: 6,
              }}
            >
              what went well?
            </div>
            <textarea
              value={wentWell}
              onChange={e => onWentWellChange(e.target.value)}
              placeholder="what worked?"
              rows={2}
              style={{
                width: '100%',
                background: '#0f0f0f',
                border: '1px solid #1e1e1e',
                borderRadius: 8,
                padding: '9px 10px',
                fontSize: 13,
                color: '#e8e4dc',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: '#555',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                marginBottom: 6,
              }}
            >
              what would you do differently?
            </div>
            <textarea
              value={missed}
              onChange={e => onMissedChange(e.target.value)}
              placeholder="what missed?"
              rows={2}
              style={{
                width: '100%',
                background: '#0f0f0f',
                border: '1px solid #1e1e1e',
                borderRadius: 8,
                padding: '9px 10px',
                fontSize: 13,
                color: '#e8e4dc',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                fontSize: 11,
                color: '#555',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              actual time
            </div>
            <input
              type="number"
              value={actualMins}
              onChange={e => onActualMinsChange(e.target.value)}
              placeholder={String(task.estimated_mins)}
              min={1}
              max={480}
              style={{
                width: 72,
                background: '#0f0f0f',
                border: '1px solid #1e1e1e',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 13,
                color: '#e8e4dc',
                outline: 'none',
                textAlign: 'center',
              }}
            />
            <span style={{ fontSize: 13, color: '#444' }}>mins</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            paddingTop: 8,
            borderTop: '1px solid #1e1e1e',
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #2a2a2a',
              borderRadius: 24,
              padding: '10px 24px',
              fontSize: 13,
              fontWeight: 500,
              color: '#888',
              cursor: 'pointer',
            }}
          >
            cancel
          </button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={onSaveOnly}
              disabled={saving}
              style={{
                background: 'transparent',
                border: '1px solid #2a2a2a',
                borderRadius: 24,
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 500,
                color: '#888',
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.5 : 1,
              }}
            >
              save
            </button>
            <button
              type="button"
              onClick={onMarkDone}
              disabled={saving}
              style={{
                background: task.done ? '#1a2a1a' : '#e8e4dc',
                color: task.done ? '#5DCAA5' : '#0f0f0f',
                border: task.done ? '1px solid #2a3d2a' : '1px solid transparent',
                borderRadius: 24,
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 500,
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.5 : 1,
              }}
            >
              {saving ? 'saving...' : task.done ? 'update' : 'mark done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
