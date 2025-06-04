const Phaser = require('phaser');
const fs = require('fs');
const path = require('path');

function parseConfig(text) {
    const lines = text.split(/\r?\n/);
    const result = {};
    let section = null;
    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;
        const mSection = line.match(/^\[(.+)\]$/);
        if (mSection) {
            section = mSection[1];
            result[section] = {};
            continue;
        }
        const mKey = line.match(/^([^=]+)=\s*(.+)$/);
        if (section && mKey) {
            let key = mKey[1].trim();
            let value = mKey[2].trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            } else if (!isNaN(value)) {
                value = Number(value);
            }
            result[section][key] = value;
        }
    }
    return result;
}

let configData = {};
try {
    const cfgPath = path.join(__dirname, 'project.config');
    const text = fs.readFileSync(cfgPath, 'utf8');
    configData = parseConfig(text);
} catch (err) {
    console.warn('Could not read project.config, using defaults.');
}

const gameSettings = configData.game || {};
const width = gameSettings.width || 800;
const height = gameSettings.height || 600;

const config = {
    type: Phaser.AUTO,
    width: width,
    height: height,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload,
        create,
        update
    }
};

const game = new Phaser.Game(config);

function preload() {
    this.load.setBaseURL('https://labs.phaser.io');
    this.load.image('sky', 'assets/skies/space3.png');
    this.load.image('logo', 'assets/sprites/phaser3-logo.png');
    if (configData.game && configData.game.title && typeof document !== 'undefined') {
        document.title = configData.game.title;
    }
}

function create() {
    this.add.image(width / 2, height / 2, 'sky');
    const logo = this.physics.add.image(width / 2, 100, 'logo');
    logo.setVelocity(100, 200);
    logo.setBounce(1, 1);
    logo.setCollideWorldBounds(true);
}

function update() {
    // Game update logic
}

module.exports = game;
