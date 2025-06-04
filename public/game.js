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

  preload() {
    this.load.image('ladder', 'ladder.png');
    this.load.image('brick-bg', 'brick-bg.png');
    const colors = ['red', 'orange', 'yellow', 'green', 'blue'];
    for (const c of colors) {
      this.load.image(`avatar-${c}`, `avatar-${c}.png`);
    }
  }

  create() {
    this.add.text(100, 100, 'Waiting for game...', { fontSize: '32px', fill: '#fff' });
    socket.on('snapshot', (state) => this.drawState(state));
    socket.on('climb', ({ teamId, rung }) => {
      const sprite = this.avatarSprites && this.avatarSprites[teamId];
      if (sprite) {
        this.tweens.add({ targets: sprite, y: this.yForRung(rung), duration: 300 });
      }
    });
  }

  yForRung(r) {
    return 530 - r * 40;
  }

  drawState(snapshot) {
    this.add.image(400, 300, 'brick-bg');
    this.avatarSprites = [];
    for (let i = 0; i < ladderX.length; i++) {
      this.add.image(ladderX[i], 300, 'ladder');
    }

    const colors = ['red', 'orange', 'yellow', 'green', 'blue'];
    for (let i = 0; i < snapshot.teams.length; i++) {
      const team = snapshot.teams[i];
      const sprite = this.add.sprite(ladderX[i], this.yForRung(team.rung || 0), `avatar-${colors[i]}`);
      this.avatarSprites[i] = sprite;
    }
  }
}

class End extends Phaser.Scene {
  constructor() {
    super('End');
  }
}

const socket = io();
const ladderX = [100, 260, 420, 580, 740];
const config = { type: Phaser.AUTO, width: 800, height: 600, scene: [Lobby, Play, End] };
new Phaser.Game(config);
