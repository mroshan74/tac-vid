import React, { useEffect, useRef, useState } from 'react'
import AgoraRTC from 'agora-rtc-sdk-ng'
import { rtc, options } from '../config/agora-config'
import './App.css'
import socket from '../config/socket'

let remoteUsers = {}
const CreateCall = ({ callType, channel, callBack = f => f, id = '', token = '',role = 'audience'}) => {
  console.log(channel, 'channel++++++++++++++')
  const channelRef = useRef(channel)
  const screenShare = useRef()
  const [share, setShare] = useState(false)
  const remoteRef = useRef("")
  const leaveRef = useRef("")
  const [leave, setLeave] = useState(false)
  
  /**
  @rtc_client 
  ** rtc object constant of stream  
  */
  const channelInit = async() => {
    try{
      const handleUserPublished = (user, mediaType) => {
        // Store remote user joined the channel
        const id = user.uid
        remoteUsers[id] = user
        // Create a subscribe function to remote
        subscribe(user, mediaType)
      }
      
      const handleUserUnpublished = (user) => {
        const id = user.uid;
        // Get the dynamically created DIV container
        console.log('----------',id)
        const playerContainer = document.getElementById(id)
        console.log('----------',playerContainer)
        // Destroy the container
        if(playerContainer){
          playerContainer.remove()
          delete remoteUsers[id]
        }
      }

      // Create client for the user 
      console.log(role)
      rtc.client = AgoraRTC.createClient({ mode: "live", codec: "h264", role })
      
      //audience
      //if(role === 'audience'){
        // Listen for remote connections
        rtc.client.on('user-published', handleUserPublished)
        // Listen for remote disconnection
        rtc.client.on('user-unpublished', handleUserUnpublished)
      //}

      // Join the RTC channel
      console.log(channelRef.current.value,'RTC*********************************')
      const uid = await rtc.client.join(options.appId, channelRef.current , options.token, null)
      
      if(role === 'host'){
        // Create an audio track from the audio captured by a microphone
        rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack()
        // Create a video track from the video captured by a camera
        rtc.localVideoTrack = await AgoraRTC.createCameraVideoTrack()
        
        // Play local user video in the local-stream html element
        rtc.localVideoTrack.play("local-stream")
        
        // Publish the local audio and video tracks to the channel
        await rtc.client.publish([rtc.localAudioTrack, rtc.localVideoTrack])
        console.log("publish success!")
      }
    }
    catch(err){
      console.log(err)
    }
  }

  /** 
  @subscribe to the channel stream connected
  ** does not support react dynamic rendering of video elements
  ** Video fetch done by dynamically creating div containers -> outbound react
   */
  const subscribe = async(user, mediaType) => {
    // subscribe to a remote user
    try{
      await rtc.client.subscribe(user, mediaType)
      console.log("subscribe success")
      if (mediaType === 'video') {
        //! React element code
          // const PlayerContainer = React.createElement("div", {
          //   id: user.uid,
          //   className: "stream",
          // });
          // ReactDOM.render(PlayerContainer,document.getElementById("remote-stream"))
        //!  
        // setRemoteStream(...remoteStream, PlayerContainer)
        
        //! Vanilla js code -> outbound react.js -> not within react render cycle
        // Dynamically create a container in the form of a DIV element for playing the remote video track.
        const playerContainer = document.createElement("div")
        // Specify the ID of the DIV container. You can use the `uid` of the remote user.
        playerContainer.id = user.uid.toString()
        playerContainer.style.width = "320px"
        playerContainer.style.height = "240px"
        playerContainer.classList.add("remoteStream")
        playerContainer.addEventListener('click',(e)=> {
          // console.log('%cHe clicked ME ......','background:red;color:white;')
          console.log('%cVideoElement active !!! ......','background:orange;color:white;')
          console.log(e.target.id)
          const  elem = document.getElementById(`${e.target.id}`)
            if (elem.requestFullscreen) {
              elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) { /* Firefox */
              elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
              elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) { /* IE/Edge */
              elem.msRequestFullscreen();
            }
        })
        const remoteDiv = document.getElementById('remote-stream')
        remoteDiv.append(playerContainer)

        user.videoTrack.play(`${user.uid}`)

      }
      if (mediaType === 'audio') {
        user.audioTrack.play()
      }
    }
    catch(err){
      console.log(err)
    }
  }

  const channelClose = async() => {
    try {
      const localContainer = document.getElementById("local-stream")

      rtc.localAudioTrack.close()
      rtc.localVideoTrack.close()

      localContainer.textContent = ""
      socket.emit('channelRtc-closed', { id, callType })
      setLeave(true)
      callBack()

      // Traverse all remote users
      rtc.client.remoteUsers.forEach((user) => {
        // Destroy the dynamically created DIV container
        console.log(user)
        const playerContainer = document.getElementById(user.uid)
        playerContainer && playerContainer.remove()
      })

      // Leave the channel
      await rtc.client.leave()
    } catch (err) {
      console.error(err)
    }
  }

  const handleCallReject = data => {
    alert('Caller Busy')
    channelClose()
  }
  const handleCallDisconnect = data => {
    if(callType === 'direct'){
      alert('Caller Disconnected')
      channelClose()
    }
    else {
      alert('Client disconnected')
    }
  }

  useEffect(() => {
    console.log('Mount [CHANNEL] component')
      if(channel){
        channelInit()
        if(callType === 'direct'){
          console.log('%c[sockets connected to MAINFRAME]','background: #222; color: #bada55')
          socket.on('onCallReject', handleCallReject)
          socket.on('onCallDisconnect', handleCallDisconnect)
        }
        socket.on('onChannelRtcClose',handleCallDisconnect)
      }
      return()=>{
        console.log('%c [STREAM-CHANNEL] - cleanup initiated','background: #222; color: #bada55')
        if(callType === 'direct'){
          socket.off('onCallReject', handleCallReject)
          socket.off('onCallDisconnect', handleCallDisconnect)
        }
        socket.off('onChannelRtcClose',handleCallDisconnect)
        setLeave(false)
      }
  },[channel])

  const handleLeave = () => {
    channelClose()
  }
  
  const handleShareScreen = async() => {
    setShare(true)
    try{
      const screen = screenShare.current = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: "1080p_1",
      }, true)
      
      // await rtc.client.publish(screen.screenVideoTrack)
      // await rtc.client.publish(screen.screenAudioTrack)
      // You can also publish multiple tracks at once
      // await rtc.client.unpublish()

      // Can't handle two stream at once
      await rtc.client.unpublish(rtc.localVideoTrack)
      await rtc.client.publish(screen)
      console.log(screen,'[screen]----------')

      // Somebody clicked on "Stop sharing"
      //! https://agoraio-community.github.io/AgoraWebSDK-NG/api/en/interfaces/ilocaltrack.html#on
      screen.on('track-ended', event_track_ended => {
        console.log(event_track_ended)
        console.log('[*********SHARING TERMINATED***********]','onEnded')
        handleStopScreenShare()
      })
      //! Get a `MediaStreamTrack` object by custom capture
      // const logMedia = await navigator.mediaDevices.getDisplayMedia()
      // console.log(logMedia)

      // // Create a custom video track
      // const customScreenTrack = AgoraRTC.createCustomVideoTrack({
      //   mediaStreamTrack: logMedia,
      // })

      // if(customScreenTrack){
      //   await rtc.client.unpublish(rtc.localVideoTrack)
      //   await rtc.client.publish(customScreenTrack)
      // }

      // screen._mediaStreamTrack.addEventListener('onended', () => {
      //   console.log('[*********SHARING TERMINATED***********]','onEnded')
      // })
      
    }catch(err){
      console.log(err)
    }
  }
  

  const handleStopScreenShare = async() => {
    setShare(false)
    // Switching publish events
    await rtc.client.unpublish(screenShare.current)
    screenShare.current = null
    await rtc.client.publish(rtc.localVideoTrack)
  }
  //console.log(remoteStream.current)
  //console.log(remoteStream)

  return(
    <>
    {!leave && (
    <>
      <div className="container">
        {!share &&
        <input
          type="submit"
          value="Share screen"
          onClick={handleShareScreen}
        />
        }
        {share && 
        <input
          type="submit"
          value="Stop sharing screen"
          onClick={handleStopScreenShare}
        />
        }
        <input
          type="button"
          ref={leaveRef}
          value="Leave"
          onClick={handleLeave}
        />
      </div>
      <div className='videoStream-container'>
        <div id="local-stream" className="stream local-stream"></div>
        <div
          id="remote-stream"
          ref={remoteRef}
          className="remoteStream-container"
        ></div>
      </div>
    </>
    )}
  </>
  )
}

export default CreateCall
