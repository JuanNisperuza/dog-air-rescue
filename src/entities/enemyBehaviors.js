import Phaser from 'phaser';

const LEFT = 180;

// The shot animation starts one frame before the bullet, so the bullet
// lines up with the muzzle flash frame
function updateShootTiming(e, now) {
    if (!e.shootStarted && now >= e.nextShot - e.frameTime) {
        e.playOnce('shoot');
        e.shootStarted = true;
    }
    if (now >= e.nextShot) {
        e.shootStarted = false;
        return true;
    }
    return false;
}

export const BEHAVIORS = {
    sine: {
        spawn(e) {
            e.phase = Phaser.Math.FloatBetween(0, Math.PI * 2);
            e.setVelocity(-e.speed, 0);
        },
        update(e, now) {
            const amplitude = e.stat('amplitude');
            if (amplitude === 0) return;
            const frequency = e.stat('frequency');
            const t = now - e.spawnTime;
            // Vertical speed = derivative of the sine wave
            e.setVelocityY(Math.cos(t * frequency + e.phase) * amplitude * frequency * 1000);
        }
    },

    gunner: {
        spawn(e) {
            e.state = 'enter';
            e.stopAt = e.scene.scale.width * e.stat('stopX');
            e.shotsLeft = e.stat('shots');
            e.shootStarted = false;
            e.setVelocity(-e.speed, 0);
        },
        update(e, now) {
            switch (e.state) {
                case 'enter':
                    if (e.x <= e.stopAt) {
                        e.state = 'attack';
                        e.scene.fx.emote(e, '!', '#ffeb3b');
                        e.setVelocityX(0);
                        e.nextShot = now + 350;
                    }
                    break;

                case 'attack':
                    e.setVelocityY(Math.cos(now * 0.004) * 30);
                    if (updateShootTiming(e, now)) {
                        const angle = e.scene.angleToPlayer(e.muzzleX, e.muzzleY);
                        e.scene.fireEnemyBullet(e.muzzleX, e.muzzleY, angle, e.stat('bulletSpeed'));
                        e.shotsLeft--;
                        e.nextShot = now + e.stat('fireRate') / e.difficulty.fireRate;

                        if (e.shotsLeft <= 0) {
                            e.state = 'leave';
                            const vy = e.y < e.scene.scale.height / 2 ? -90 : 90;
                            e.setVelocity(-e.speed * 1.3, vy);
                        }
                    }
                    break;
            }
        }
    },

    diver: {
        spawn(e) {
            e.state = 'enter';
            e.stopAt = e.scene.scale.width * e.stat('stopX');
            e.setVelocity(-e.speed, 0);
        },
        update(e, now) {
            switch (e.state) {
                case 'enter':
                    if (e.x <= e.stopAt) {
                        e.state = 'windup';
                        e.setVelocity(40, 0);
                        e.playAnim('warn');
                        e.scene.fx.emote(e, '!!', '#ff5252');
                        e.scene.fx.enemyTelegraph();
                        e.dashAt = now + e.stat('windup');
                    }
                    break;

                case 'windup':
                    if (now >= e.dashAt) {
                        e.state = 'dash';
                        e.playAnim('dash');
                        e.scene.sfx.dive();
                        const angle = e.scene.angleToPlayer(e.x, e.y);
                        e.scene.physics.velocityFromAngle(angle, e.stat('dashSpeed') * e.difficulty.speed, e.body.velocity);
                        e.setAngle(angle - LEFT);
                    }
                    break;
            }
        }
    },

    heavy: {
        spawn(e, now) {
            e.setVelocity(-e.speed, 0);
            e.nextShot = now + 1200;
            e.shootStarted = false;
        },
        update(e, now) {
            if (e.x < e.scene.scale.width * 0.7 && e.body.velocity.x < 0) {
                e.setVelocityX(-e.speed * 0.15);
            }
            e.setVelocityY(Math.cos(now * 0.0015) * 25);

            if (updateShootTiming(e, now)) {
                const center = e.scene.angleToPlayer(e.muzzleX, e.muzzleY);
                const count = e.stat('spread');
                const step = e.stat('spreadAngle');
                const first = center - (step * (count - 1)) / 2;
                for (let i = 0; i < count; i++) {
                    e.scene.fireEnemyBullet(e.muzzleX, e.muzzleY, first + step * i, e.stat('bulletSpeed'));
                }
                e.nextShot = now + e.stat('fireRate') / e.difficulty.fireRate;
            }
        }
    }
};
