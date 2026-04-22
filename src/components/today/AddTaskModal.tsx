'use client'

type GoalOption = {
  id: number
  title: string
}

type AddTaskModalProps = {
  open: boolean
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  allDay: boolean
  goalId: number | null
  goals: GoalOption[]
  saving: boolean
  onClose: () => void
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onDateChange: (value: string) => void
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  onAllDayChange: (value: boolean) => void
  onGoalChange: (value: number | null) => void
  onSave: () => void
}

export default function AddTaskModal({
  open,
  title,
  description,
  date,
  startTime,
  endTime,
  allDay,
  goalId,
  goals,
  saving,
  onClose,
  onTitleChange,
  onDescriptionChange,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onAllDayChange,
  onGoalChange,
  onSave,
}: AddTaskModalProps) {
  if (!open) return null

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
          padding: '20px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxHeight: 'min(85vh, calc(100vh - 32px))',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            add task
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: 22,
              lineHeight: 1,
              cursor: 'pointer',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <input
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="Add title"
          style={{
            width: '100%',
            background: '#1b1b1b',
            border: '1px solid #2a2a2a',
            borderRadius: 10,
            padding: '12px 13px',
            fontSize: 18,
            color: '#e8e4dc',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          <input
            type="date"
            value={date}
            onChange={e => onDateChange(e.target.value)}
            style={{
              width: '100%',
              background: '#181818',
              border: '1px solid #333',
              borderRadius: 8,
              padding: '10px 12px',
              color: '#d8d5cd',
            }}
          />
          {!allDay ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
              <input
                type="time"
                value={startTime}
                onChange={e => onStartTimeChange(e.target.value)}
                style={{
                  width: '100%',
                  background: '#181818',
                  border: '1px solid #333',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: '#d8d5cd',
                }}
              />
              <span style={{ color: '#666' }}>–</span>
              <input
                type="time"
                value={endTime}
                onChange={e => onEndTimeChange(e.target.value)}
                style={{
                  width: '100%',
                  background: '#181818',
                  border: '1px solid #333',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: '#d8d5cd',
                }}
              />
            </div>
          ) : null}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#999', fontSize: 13 }}>
            <input type="checkbox" checked={allDay} onChange={e => onAllDayChange(e.target.checked)} />
            All day
          </label>
        </div>
        <textarea
          value={description}
          onChange={e => onDescriptionChange(e.target.value)}
          placeholder="Add description"
          rows={3}
          style={{
            width: '100%',
            background: '#181818',
            border: '1px solid #333',
            borderRadius: 10,
            padding: '10px 12px',
            color: '#d8d5cd',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <select
          value={goalId ?? ''}
          onChange={e => onGoalChange(e.target.value ? Number(e.target.value) : null)}
          style={{
            width: '100%',
            background: '#181818',
            border: '1px solid #333',
            borderRadius: 10,
            padding: '10px 12px',
            color: '#d8d5cd',
            fontFamily: 'inherit',
          }}
        >
          {goals.map(g => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onSave}
            disabled={!title.trim() || goalId == null || saving}
            style={{
              background: '#e8e4dc',
              color: '#0f0f0f',
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              opacity: !title.trim() || goalId == null || saving ? 0.45 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
