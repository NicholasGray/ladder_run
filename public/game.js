class Lobby extends Phaser.Scene {
  constructor() {
    super('Lobby');
  }

  create() {
    const form = document.createElement('form');

    const nickInput = document.createElement('input');
    nickInput.name = 'nick';
    nickInput.placeholder = 'Nickname';

    const roomInput = document.createElement('input');
    roomInput.name = 'room';
    roomInput.placeholder = 'Room';

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Join';

    form.appendChild(nickInput);
    form.appendChild(roomInput);
    form.appendChild(submit);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nick = nickInput.value.trim();
      const roomId = roomInput.value.trim();
      socket.emit('join', { roomId, nick });
      form.remove();
      this.scene.start('Play');
    });

    document.body.appendChild(form);
  }
}

class Play extends Phaser.Scene {
  constructor() {
    super('Play');
  }

  create() {
    this.add.text(100, 100, 'Waiting for game...', { fontSize: '32px', fill: '#fff' });
  }
}

class End extends Phaser.Scene {
  constructor() {
    super('End');
  }
}

const socket = io();
const config = { type: Phaser.AUTO, width: 800, height: 600, scene: [Lobby, Play, End] };
new Phaser.Game(config);
