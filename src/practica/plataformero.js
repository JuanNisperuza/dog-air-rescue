import phaser from 'phaser';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }
    
    preload() {
        // Load assets here
    }
    create() {
      const floor = this.add.rectangle(400, 550, 800, 100, 0x00ff00);
      this.physics.add.existing(floor, true); 

      const platform = this.add.rectangle(550,420, 200, 20, 0x27ae60);
      this.physics.add.existing(platform, true);

      this.player = this.add.rectangle(200, 100, 32, 48, 0xf1c40f);
      this.physics.add.existing(this.player);
      this.player.body.setCollideWorldBounds(true);

      this.physics.add.collider(this.player, floor);
      this.physics.add.collider(this.player, platform);

      this.keys = this.input.keyboard.createCursorKeys();

      this.speed = 250;
      this.jumpForce = 500;
    }
    
    update() {
        const playerBody = this.player.body;
        
        if (this.keys.left.isDown) {
            playerBody.setVelocityX(-this.speed);
        } else if (this.keys.right.isDown) {
            playerBody.setVelocityX(this.speed);
        } else {
            playerBody.setVelocityX(0);
        }

        const isOnGround = playerBody.blocked.down || playerBody.touching.down;
        const isJumping = Phaser.Input.Keyboard.JustDown(this.keys.space);

        if (isJumping && isOnGround) {
            playerBody.setVelocityY(-this.jumpForce);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#6752dd',
    scene: MainScene,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: true
        }
    }
};
new Phaser.Game(config);