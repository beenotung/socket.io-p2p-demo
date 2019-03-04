let hostname = '127.0.0.1';
let port = 3000;
let id = Math.random().toString(36).substr(2);

let P2P = require('socket.io-p2p');
let io = require('socket.io-client');

let socket = io.connect(`http://${hostname}:${port}`);
let p2p = new P2P(socket, {
    autoUpgrade: false,
});
Object.assign(window as any, {
    p2p,
    socket,
});

function send(event: string, data) {
    // socket.emit(event, data);
    p2p.emit(event, data);
}

function on(event: string, cb: (data: any) => void) {
    // socket.on(event, cb);
    p2p.on(event, cb);
}

function useId(cb: (peerId: string) => void) {
    if (p2p.peerId) {
        cb(p2p.peerId)
    } else {
        setTimeout(() => useId(cb), 30);
    }
}

function sendToPeer(peerId: string, event: string, data) {
    send('peer-send', {peerId, event, data})
}

function sendToAll(event: string, data) {
    send('peer-broadcast', {event, data})
}

on('upgrade', () => {
    console.log('using WebRTC')
});
on('peer-greet', ({peerId}) => {
    console.log('greeting from peer:', peerId);
    // sendToPeer(peerId, 'go-private', true);
    useId(ownId => sendToPeer(peerId, 'peer-chat', {from: ownId, msg: 'Hi ' + peerId + '. How are you?'}));
});
on('peer-chat', ({from, msg}) => {
    console.log('chat from peer:', from, ':', msg);
    useId(ownId => sendToPeer(from, 'peer-chat', {from: ownId, msg: 'I am good, how about you?'}))
});
on('peer-time', data => {
    console.log('peer-time', data);
});
on('peer-lost', ({peerId}) => {
    console.log('lost peer:', peerId);
});
// on('go-private', () => {
//     console.log('go-private');
//     p2p.upgrade();
// });
on('connect', () => {
    console.log('connected');
    useId(peerId => {
        console.log('own peer id:', peerId);
        send('peer-greet', {peerId});
        send('peer-time', {peerId, time: Date.now()})
    });
});