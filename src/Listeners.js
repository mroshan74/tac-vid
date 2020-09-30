import React,{ Fragment, useEffect, useState } from 'react'
import CreateCall from './components/CreateCall'
import socket from './config/socket'
import shortid from 'shortid'
import axios from './config/axios'


const Listeners = () => {
    const [userId, setUserId] = useState('')
    const [state, setState] = useState({
        user: '',
        callId: ''
    })
    const [incoming, setIncoming] = useState({
        callerId: '',
        callerName: '',
        callStatus: false,
        channelId: ''
    })
    const [acceptCall, setAcceptCall] = useState(false)
    const [waitCall, setWaitCall] = useState(false)
    const [encrypt, setEncrypt] = useState('')
    const callStateHandler = data => {
        setIncoming(data)
    }
    useEffect(() => {
        socket.emit('userId', {
            userId
        },[userId])

        socket.on('callListener', callStateHandler)

        return () => {
            socket.off('callListener', callStateHandler)
        }
    })
    const handleSetUser = e => {
        e.preventDefault()
        console.log(state.user)
        setUserId(state.user)
    }
    const handleCallUser = e => {
        e.preventDefault()
        const encryptId = shortid.generate()
        setEncrypt(encryptId)
        axios.post(`/users/call?id=${userId}&rec=${state.callId}`,{encryptId})
            .then(res => {
                if(res.data.ok){
                    console.log('Call waiting')
                    setWaitCall(true)
                }
            })
            .catch(err => {
                console.log((err))
            })

    }
    const handleAcceptCall = () => {
        setAcceptCall(true)
    }
    const resetCallHandler = () =>{
        setIncoming({
            callerId: '',
            callerName: '',
            callStatus: false,
            channelId: ''
        })
        setAcceptCall(false)
        setWaitCall(false)
        setEncrypt('')
    }
    return (
        <div>
            <div>
                <form onSubmit={handleSetUser}>
                    <input type="text" value={state.user} onChange={(e)=>{setState({...state,user:e.target.value})}}/>
                    <input type="submit" value="setUser"/>
                </form>
                <form onSubmit={handleCallUser}>
                    <input type="text" value={state.callId} onChange={(e)=>{setState({...state,callId:e.target.value})}}/>
                    <input type="submit" value="Call User"/>
                </form>
            </div>
            <div>
                {(incoming.callerId && !acceptCall) && 
                    <Fragment>
                        <h4>Call Receiving</h4>
                        <h3>{incoming.callerName}</h3>
                        <button onClick={() => {handleAcceptCall()}}>Accept</button>
                        <button>Reject</button>
                    </Fragment>
                }
            </div>
            {
                acceptCall && <CreateCall channel={incoming.channelId} callBack={resetCallHandler}/>
            }
            {
                waitCall && <CreateCall channel={encrypt} callBack={resetCallHandler}/>
            }
            <pre>{JSON.stringify(incoming)}</pre>
        </div>
    )
} 

export default Listeners