import React, { useState } from 'react'
import CreateCall from './components/CreateCall'
// import ReactDOM from 'react-dom'

function App() {
  const [joined, setJoined] = useState(false)
  const [channel, setChannel] = useState('')
  const [value, setValue] = useState('')
  const [role, setRole] = useState('host')
  const handleSubmit = (e) => {
    e.preventDefault()
    setJoined(true)
    setChannel(value)
  }
  return (
    <>
      <div className='container'>
        <input
          type='text'
          id='channel'
          placeholder='Enter Channel name'
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
          }}
        />
        <input
          type='text'
          id='channel'
          placeholder='Role'
          value={role}
          onChange={(e) => {
            setRole(e.target.value)
          }}
        />
        <input
          type='submit'
          value='Join'
          onClick={handleSubmit}
          disabled={joined ? true : false}
        />
      </div>
      {joined && <CreateCall channel={channel} role={role}/>}
    </>
  )
}

export default App
