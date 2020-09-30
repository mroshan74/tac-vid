import io from 'socket.io-client'
//import { SOCKET_URL } from 'config'

let server = 'http://localhost:7080'
// let server = '/'
const socket = io(server) 

export default socket