import {Socket} from "socket.io";
import * as util from "util";

let hostname = '0.0.0.0';
let port = 3000;

let server = require('http').createServer(
    require('ecstatic')({root: __dirname, handleError: false})
);
let io = require('socket.io')(server);
server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}`);
});
let p2p = require('socket.io-p2p-server').Server;
io.use(p2p);

let sockets = new Map<string, Socket>();

function report() {
    util.log('number of connections:' + sockets.size);
}

io.on('connection', socket => {
    // console.log('connection:', {
    //     remoteAddress: socket.conn.remoteAddress,
    //     id: socket.conn.id,
    // });
    sockets.set(socket.conn.id, socket);
    report();

    socket.on('disconnect', () => {
        sockets.delete(socket.conn.id);
        report();
    });

    function proxyBroadcast(event: string, log: boolean = false) {
        socket.on(event, data => {
            if (log) {
                util.log(event + ' : ' + util.inspect(data))
            }
            socket.broadcast.emit(event, data)
        })
    }

    function proxySend(peerId: string, event: string, data) {
        if (!sockets.has(peerId)) {
            socket.send('peer-lost', {peerId});
            return;
        }
        sockets.get(peerId).emit(event, data);
    }

    proxyBroadcast('peer-greet', true);
    proxyBroadcast('peer-time');

    socket.on('peer-send', ({peerId, event, data}) => {
        proxySend(peerId, event, data);
    });
    socket.on('peer-broadcast', ({event, data}) => {
        proxyBroadcast(event, data);
    });

    // socket.on('peer-msg', data => {
    //     console.log('Message from peer:', data);
    //     socket.broadcast.emit('peer-msg', data)
    // });
    // socket.on('go-private', data => {
    //     socket.broadcast.emit('go-private', data)
    // });
});