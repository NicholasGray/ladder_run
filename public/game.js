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
      socket.roomId = roomId;
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
    this.createAnswerUi();
    socket.on('snapshot', (state) => this.drawState(state));
    socket.on('climb', ({ teamId, rung }) => {
      const sprite = this.avatarSprites && this.avatarSprites[teamId];
      if (sprite) {
        this.tweens.add({ targets: sprite, y: this.yForRung(rung), duration: 300 });
        this.flashSprite(teamId, 0x00ff00);
      }
    });
    socket.on('question', (q) => {
      this.showQuestion(q);
      let sec = 15;
      this.timerText = this.add.text(400, 10, '15', { fontSize: 24 }).setOrigin(0.5, 0);
      this.time.addEvent({ delay: 1000, repeat: 14, callback: () => { --sec; this.timerText.setText(sec); } });
    });
    socket.on('answerWrong', () => {
      if (this.myTeamId !== undefined) {
        this.flashSprite(this.myTeamId, 0xff0000);
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
      if (team.players.some(p => p.id === socket.id)) {
        this.myTeamId = team.id !== undefined ? team.id : i;
      }
    }
  }

  createAnswerUi() {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.bottom = '10px';
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.background = 'rgba(0,0,0,0.5)';
    container.style.padding = '10px';
    container.style.color = '#fff';
    container.style.display = 'none';

    const questionEl = document.createElement('div');
    container.appendChild(questionEl);

    const optionsEl = document.createElement('div');
    container.appendChild(optionsEl);

    const timerEl = document.createElement('div');
    timerEl.style.marginTop = '4px';
    container.appendChild(timerEl);

    const submit = document.createElement('button');
    submit.textContent = 'Submit';
    submit.style.display = 'block';
    submit.style.marginTop = '4px';
    container.appendChild(submit);

    submit.addEventListener('click', () => this.submitAnswer());

    document.body.appendChild(container);

    this.qContainer = container;
    this.qQuestionEl = questionEl;
    this.qOptionsEl = optionsEl;
    this.qTimerEl = timerEl;
  }

  showQuestion(q) {
    this.currentQ = q;
    this.qQuestionEl.textContent = q.prompt;
    this.qOptionsEl.innerHTML = '';
    q.options.forEach(opt => {
      const label = document.createElement('label');
      label.style.display = 'block';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'answer';
      input.value = opt;
      label.appendChild(input);
      label.appendChild(document.createTextNode(opt));
      this.qOptionsEl.appendChild(label);
    });
    this.qContainer.style.display = 'block';
    this.startCountdown(q.timeMs || 15000);
  }

  startCountdown(ms) {
    if (this.timerEvent) this.timerEvent.remove();
    let remaining = Math.ceil(ms / 1000);
    this.qTimerEl.textContent = `Time: ${remaining}`;
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: remaining - 1,
      callback: () => {
        remaining -= 1;
        this.qTimerEl.textContent = `Time: ${remaining}`;
        if (remaining <= 0) {
          this.timerEvent = null;
        }
      }
    });
  }

  submitAnswer() {
    if (!this.currentQ) return;
    const checked = this.qOptionsEl.querySelector('input[name="answer"]:checked');
    const answer = checked ? checked.value : '';
    socket.emit('answer', { roomId: socket.roomId, id: this.currentQ.id, answer });
    this.qContainer.style.display = 'none';
    this.currentQ = null;
  }

  flashSprite(teamId, color) {
    const sprite = this.avatarSprites && this.avatarSprites[teamId];
    if (!sprite) return;
    const g = this.add.graphics();
    g.lineStyle(4, color, 1);
    g.strokeRect(sprite.x - sprite.width / 2 - 4, sprite.y - sprite.height / 2 - 4, sprite.width + 8, sprite.height + 8);
    this.time.delayedCall(200, () => g.destroy());
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
