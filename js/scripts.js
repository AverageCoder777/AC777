//инициализация игры
let game = new Phaser.Game(1920,1080,Phaser.CANVAS,null,{
    preload: preload,
    create: create,
    update: update,
});

//инициализация мяча, платформы, блоков и их информации
let ball;
let platform;
let bricks;
let newBrick;
let brickInfo;
let backgr;

//инициализируем очки
let score = 0;
let scoreText;

//допжизни
let lives = 3;
let livesText;
let lifeLostText;

//Инициализация состояния игры и кнопки
let playing = false;
let startButton;

//счет лучшего результата
if (!localStorage.getItem("BestScore")){
    localStorage.setItem("BestScore",0);
}
let bestScore = localStorage.getItem("BestScore");
let bestScoreTextGame;
let bestScoreTextStart;

//стиль для всех текстов
let textStyle = {font: "34px Arial", fill: "000"};

//предзагрузка ассетов
function preload(){
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
    game.stage.backgroundColor = '#78ebfa';
    game.load.image("backgr","Assets/Background.png");
    game.load.image("platform","Assets/platform.png");
    game.load.image("brick","Assets/brick.png");
    game.load.image("ball","Assets/ball.png")
    game.load.spritesheet("button","Assets/button.png",120,40);
    game.load.spritesheet("ball","Assets/ball-anim.png",64,64);
}

//добавление ассетов на экран
function create(){
    game.physics.startSystem(Phaser.Physics.ARCADE);
    backgr = game.add.sprite(game.world.width*0.5,game.world.height*0.5,"backgr");
    backgr.anchor.set(0.5);
    ball = game.add.sprite(game.world.width*0.5,game.world.height*0.5,"ball");
    ball.animations.add("ball_bounce",[1,2,3,4,5,6,7,8,7,6,5,4,3,2,1],60);
    ball.anchor.set(0.5);
    game.physics.enable(ball, Phaser.Physics.ARCADE);
    ball.body.collideWorldBounds = true; //стены для физики ставятся по границам canvas
    ball.body.bounce.set(1.0); //отскакиваемость от стен
    game.physics.arcade.checkCollision.down = false; // отключение коллизии для нижней стены
    ball.checkWorldBounds = true; //проверка нахождения мячика внутри игровых границ
    ball.events.onOutOfBounds.add(ballLeaveScreen,this);

    platform = game.add.sprite(game.world.width*0.5,game.world.height-70,"platform");
    platform.anchor.set(0.5,1); //Установка якоря картинки по центру для более простого позиционирования
    game.physics.enable(platform, Phaser.Physics.ARCADE);
    platform.body.immovable = true;
    
    //создание всех кирпичиков
    initBricks();

    //добавление текстов с очками и жизнями
    scoreText = game.add.text(5,0,"Очки: 0",textStyle);
    livesText = game.add.text(game.world.width-5, 0, "Жизни: 3",textStyle);
    livesText.anchor.set(1,0);

    //превентивное создание невидимого текста о потерянной жизни
    lifeLostText = game.add.text(game.world.width*0.5,game.world.height*0.5,"Жизнь потеряна, нажмите для продолжения",{font: "40px Arial", fill: "#f00"});
    lifeLostText.anchor.set(0.5);
    lifeLostText.visible = false;
    
    //создание текста с лучшим результатом
    bestScoreTextGame = game.add.text(game.world.width*0.5,20,"Лучший результат: "+bestScore,textStyle);
    bestScoreTextGame.anchor.set(0.5);
    bestScoreTextGame.visible = false;

    //второй текст с лучшим результатом, но только на стартовом экране
    bestScoreTextStart = game.add.text(game.world.width*0.5,game.world.height*0.4,"Лучший результат: "+bestScore,{font: "40px Arial", fill: "000"});
    bestScoreTextStart.anchor.set(0.5);

    //создание стартовой кнопки
    startButton = game.add.button(game.world.width * 0.5, game.world.height * 0.5 , "button", startGame, this, 1, 0, 2);
    startButton.anchor.set(0.5);
    startButton.scale.set(2);
    
    //шар и платформа невидимы до тех пор, пока игрок не запустит функцию startGame (нажмет кнопку Start)
    ball.visible = false;
    platform.visible = false;
    scoreText.visible = false;
    livesText.visible = false;
    bricks.visible = false;
}

//перемещение объектов. Платформа двигается только во время игры.
function update(){
    game.physics.arcade.collide(ball,platform,ballHitPlatform);
    game.physics.arcade.collide(ball,bricks,ballHitBrick);
    if (playing){
        platform.x = game.input.x || game.world.width *0.5;
    }
}
//если мяч падает вниз, жизнь уменьшается на 1, мяч и платформа скидывают свои позиции. Если жизней 0, то выводится предупреждение и игра перезапускается
function ballLeaveScreen(){
    lives--;
    if (lives){
        livesText.setText("Жизни: "+lives);
        lifeLostText.visible = true;

        ball.reset(game.world.width*0.5,game.world.height*0.5);
        platform.reset(game.world.width*0.5,game.world.height - 70);
        ball.visible = false;
        platform.visible = false;
        game.input.onDown.addOnce(function(){
            lifeLostText.visible = false;
            ball.visible = true;
            platform.visible = true;
            ball.body.velocity.set(350,-350);
        }, this);
    } else{
        alert("Вы проиграли!");
        reloadGame();
    }
}
//если мяч задевает кирпич, то создается анимация через killTween, очки увеличиваются на 10, происходит проверка оставшихся кирпичей. Если их осталось 0 или очки перевалили за 550, то идет подсчет очков с добавлением бонусов за оставшиеся жизни. Выводится итог
//и игра перезапускается
function ballHitBrick(ball,brick){
    const killTween = game.add.tween(brick.scale);
    killTween.to({x:0,y:0},50,Phaser.Easing.Linear.None);
    killTween.onComplete.addOnce(()=>{
        brick.kill();
        score +=10;
    },this);
    killTween.start();
    ball.animations.play("ball_bounce");
    scoreText.setText("Очки: "+score);
    if (score === brickInfo.count.row*brickInfo.count.col*10 || score >=550){
        score +=lives*150;
        alert ("Вы победили, поздравляю! Ваш итоговый счет: "+score);
        reloadGame();
    }
}
function reloadGame(){
    if (bestScore < score){
        localStorage.setItem("BestScore", score);
    };
    bestScoreTextGame.setText("Лучший результат: "+bestScore);
    bestScoreTextStart.setText("Лучший результат: "+bestScore);
    ball.reset(game.world.width*0.5,game.world.height*0.5);
    platform.reset(game.world.width*0.5,game.world.height - 70);
    ball.body.velocity.set(350,-350);
    score = 0;
    scoreText.setText("Очки: "+score);
    lives = 3;
    livesText.setText("Жизни: "+lives);
    bricks.destroy();
    initBricks();
    playing = false;
    ball.visible = false;
    platform.visible = false;
    scoreText.visible = false;
    livesText.visible = false;
    bricks.visible = false;
    bestScoreTextGame.visible = false;
    bestScoreTextStart.visible = true;
    
    startButton = game.add.button(game.world.width * 0.5, game.world.height * 0.5 , "button", startGame, this, 1, 0, 2);
    startButton.anchor.set(0.5);
    startButton.scale.set(2);
}
function initBricks(){
    brickInfo ={
        width: 64,
        height: 32,
        count: {
            row: 3,
            col: (game.world.width-120)/(20+64),
        },
        offset:{
            top: 140,
            left: 60,
        },
        padding:20,
    };
    bricks = game.add.group();
    for (c=0;c<brickInfo.count.col;c++){
        for(r=0;r<brickInfo.count.row;r++){
            let brickX = c*(brickInfo.width + brickInfo.padding)+brickInfo.offset.left;
            let brickY = r*(brickInfo.height + brickInfo.padding)+brickInfo.offset.top;
            newBrick = game.add.sprite(brickX, brickY,"brick");
            game.physics.enable(newBrick,Phaser.Physics.ARCADE);
            newBrick.body.immovable = true;
            newBrick.anchor.set(0.5);
            bricks.add(newBrick);
        }
    }
}
function ballHitPlatform(ball,platform){
    ball.animations.play("ball_bounce");
    ball.body.velocity.x = -1*5*(platform.x-ball.x);
    ball.body.bounce.set(1.01);
}
function startGame(){
    startButton.destroy();
    bestScoreTextGame.visible = true;
    bestScoreTextStart.visible = false;
    ball.visible = true;
    platform.visible = true;
    scoreText.visible = true;
    livesText.visible = true;
    bricks.visible = true;
    ball.body.velocity.set(350,-350);
    playing = true;
}