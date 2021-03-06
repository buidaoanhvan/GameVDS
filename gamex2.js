(function () {
    var game;
    class Question {
        constructor() { }
        getQuestion() {
            fetch('http://45.77.247.208/question.php')
                .then(res => {
                    return res.json();
                })
                .then(data => {
                    this.id = data.QuestionID;
                    this.question = data.Question;
                    this.answer = data.Answer;
                })
                .catch(err => {
                    console.log(err);
                })
        }
    }

    var stateQues = {

    }

    if (!stateQues.question) var q = new Question();
    q.getQuestion();
    var gameOptions = {
        timeLimit: 60,
        timeDow: 0,
        gravity: 2000,
        crateSpeed: 700,
        crateHorizontalRange: 540,
        fallingHeight: 700,
        localStorageName: "stackthecratesgame",
        gameWidth: 640,
        gameHeight: 960,
        playerSpeed: 6000,
        stateQuestion: {
            question: '',
            answer: [],
        }
    }

    var GROUNDHEIGHT;
    var CRATEHEIGHT;

    window.onload = function () {
        var windowWidth = window.innerWidth;
        var windowHeight = window.innerHeight;
        var ratio = windowHeight / windowWidth;
        if (ratio >= 1) {
            if (ratio < 1.5) {
                gameOptions.gameWidth = gameOptions.gameHeight / ratio;
            }
            else {
                gameOptions.gameHeight = gameOptions.gameWidth * ratio;
            }
        }
        game = new Phaser.Game(gameOptions.gameWidth, gameOptions.gameHeight, Phaser.CANVAS);
        game.state.add("PlayGame", playGame);
        game.state.start("PlayGame");
    }

    var playGame = function () { };

    playGame.prototype = {
        preload: function () {
            game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
            game.scale.pageAlignHorizontally = true;
            game.scale.pageAlignVertically = true;
            game.stage.disableVisibilityChange = true;
            game.load.image("ground", "assets/sprites/ground2.png");
            game.load.image("sky", "assets/sprites/sky2.png");
            game.load.image("crate", "assets/sprites/crate2.png");
            game.load.image("title", "assets/sprites/title2.png");
            game.load.image("tap", "assets/sprites/tap.png");
            game.load.audio("hpbd", ["assets/sounds/HPBD.mp3", "assets/sounds/HPBD.ogg"]);
            game.load.audio("hit01", ["assets/sounds/hit01.mp3", "assets/sounds/hit01.ogg"]);
            game.load.audio("hit02", ["assets/sounds/hit02.mp3", "assets/sounds/hit02.ogg"]);
            game.load.audio("hit03", ["assets/sounds/hit03.mp3", "assets/sounds/hit03.ogg"]);
            game.load.audio("remove", ["assets/sounds/remove.mp3", "assets/sounds/remove.ogg"]);
            game.load.audio("gameover", ["assets/sounds/gameover.mp3", "assets/sounds/gameover.ogg"]);
            game.load.bitmapFont("font", "assets/fonts/font.png", "assets/fonts/font.fnt");
            game.load.bitmapFont("smallfont", "assets/fonts/smallfont.png", "assets/fonts/smallfont.fnt");
        },
        
        create: function () {
            if (!Phaser.Device.desktop) {
                game.scale.forceOrientation(false, true);
                game.scale.enterIncorrectOrientation.add(function () {
                    game.paused = true;
                    document.querySelector("canvas").style.display = "none";
                    document.getElementById("wrongorientation").style.display = "block";
                })
                game.scale.leaveIncorrectOrientation.add(function () {
                    game.paused = false;
                    document.querySelector("canvas").style.display = "block";
                    document.getElementById("wrongorientation").style.display = "none";
                })
            }
            game.sound.stopAll();
            this.lastSoundPlayed = Date.now();
            this.savedData = localStorage.getItem(gameOptions.localStorageName) == null ? { score: 0 } : JSON.parse(localStorage.getItem(gameOptions.localStorageName));
            this.hitSound = [game.add.audio("hit01"), game.add.audio("hit02"), game.add.audio("hit03")];
            this.gameOverSound = game.add.audio("gameover");
            this.removeSound = game.add.audio("remove");
            this.gamehpbd = game.add.audio("hpbd");
            this.score = 0;
            GROUNDHEIGHT = game.cache.getImage("ground").height;
            CRATEHEIGHT = game.cache.getImage("crate").height;
            this.firstCrate = true;
            var sky = game.add.image(0, 0, "sky");
            sky.width = game.width;
            sky.height = game.height;
            this.cameraGroup = game.add.group();
            this.crateGroup = game.add.group();
            this.cameraGroup.add(this.crateGroup);
            game.physics.startSystem(Phaser.Physics.BOX2D);
            game.physics.box2d.gravity.y = gameOptions.gravity;
            this.canDrop = true;
            var ground = game.add.sprite(game.width / 2, game.height, "ground");
            ground.y = game.height - ground.height / 2;
            this.movingCrate = game.add.sprite((game.width - gameOptions.crateHorizontalRange) / 2, game.height - GROUNDHEIGHT - gameOptions.fallingHeight, "crate");
            this.movingCrate.anchor.set(0.5);
            this.cameraGroup.add(this.movingCrate);
            var crateTween = game.add.tween(this.movingCrate).to({
                x: (game.width + gameOptions.crateHorizontalRange) / 2
            }, gameOptions.crateSpeed, Phaser.Easing.Linear.None, true, 0, -1, true);
            game.physics.box2d.enable(ground);
            ground.body.friction = 1;
            ground.body.static = true;
            ground.body.setCollisionCategory(1);
            this.cameraGroup.add(ground);
            game.input.onDown.add(this.dropCrate, this);
            this.menuGroup = game.add.group();
            var tap = game.add.sprite(game.width / 2, game.height / 2, "tap");
            tap.anchor.set(0.5);
            this.menuGroup.add(tap);
            var title = game.add.image(game.width / 2, tap.y - 470, "title");
            title.anchor.set(0.5, 0);
            this.menuGroup.add(title);
            this.gamehpbd = game.add.audio("hpbd");
            this.gamehpbd.play();
            var tapTween = game.add.tween(tap).to({
                alpha: 0
            }, 150, Phaser.Easing.Cubic.InOut, true, 0, -1, true);
        },
        dropCrate: function () {
            if (this.firstCrate) {
                this.firstCrate = false;
                this.menuGroup.destroy();
                this.timer = 0;
                this.timerEvent = game.time.events.loop(Phaser.Timer.SECOND, this.tick, this);
                this.timeText = game.add.bitmapText(10, 10, "font", gameOptions.timeLimit.toString(), 72);
            }
            if (this.canDrop && this.timer <= gameOptions.timeLimit) {
                this.canDrop = false;
                this.movingCrate.alpha = 0;
                var fallingCrate = game.add.sprite(this.movingCrate.x, this.movingCrate.y, "crate");
                fallingCrate.hit = false;
                game.physics.box2d.enable(fallingCrate);
                fallingCrate.body.friction = 1;
                fallingCrate.body.bullet = true;
                this.crateGroup.add(fallingCrate);
                fallingCrate.body.setCollisionCategory(1);
                fallingCrate.body.setCategoryContactCallback(1, function (b, b2, fixture1, fixture2, contact, impulseInfo) {
                    var delay = Date.now() - this.lastSoundPlayed;
                    if (delay > 200 && this.timer <= gameOptions.timeLimit) {
                        this.lastSoundPlayed = Date.now();
                        Phaser.ArrayUtils.getRandomItem(this.hitSound).play();
                    }
                    if (!b.sprite.hit) {
                        b.sprite.hit = true;
                        b.bullet = false;
                        this.getMaxHeight();
                    }
                }, this);
            }
        },
        update: function () {
            this.crateGroup.forEach(function (i) {
                if (i.y > game.height + i.height) {
                    if (!i.hit) {
                        this.getMaxHeight();
                    }
                    i.destroy();
                }
            }, this);
        },
        scaleCamera: function (cameraScale) {
            var moveTween = game.add.tween(this.cameraGroup).to({
                x: (game.width - game.width * cameraScale) / 2,
                y: game.height - game.height * cameraScale,
            }, 200, Phaser.Easing.Quadratic.IN, true);
            var scaleTween = game.add.tween(this.cameraGroup.scale).to({
                x: cameraScale,
                y: cameraScale,
            }, 200, Phaser.Easing.Quadratic.IN, true);
            scaleTween.onComplete.add(function () {
                this.canDrop = true;
                this.movingCrate.alpha = 1;
            }, this)
        },
        getMaxHeight: function () {
            var maxHeight = 0
            this.crateGroup.forEach(function (i) {
                if (i.hit) {
                    var height = Math.round((game.height - GROUNDHEIGHT - i.y - CRATEHEIGHT / 2) / CRATEHEIGHT) + 1;
                    maxHeight = Math.max(height, maxHeight);
                }
            }, this);
            this.movingCrate.y = game.height - GROUNDHEIGHT - maxHeight * CRATEHEIGHT - gameOptions.fallingHeight;
            var newHeight = game.height + CRATEHEIGHT * maxHeight;
            var ratio = game.height / newHeight;
            this.scaleCamera(ratio);
        },
        tick: function () {
            this.timer++;
            gameOptions.timeDow++;
            this.timeText.text = (gameOptions.timeLimit - this.timer).toString()
            if (this.timer > gameOptions.timeLimit) {
                this.timeText.text = 0;
                this.game.paused = true;

                Swal.fire({
                    title: `<p style="font-size: 18px">Câu hỏi: ${q.question}</p>`,
                    input: 'radio',
                    confirmButtonText: 'Xác nhận',
                    showLoaderOnConfirm: true,
                    customClass: {
                        input: "my-radio"
                    },
                    allowOutsideClick: false,
                    inputOptions: {
                        "1": q.answer[0],
                        "2": q.answer[1],
                        "3": q.answer[2]
                    },
                    preConfirm: (ans) => {
                        return fetch(`http://45.77.247.208/question.php?id=${q.id}&ans=${ans}`)
                            .then(res => {
                                return res.json()
                            })
                            .then(ans => {
                                if (ans) {
                                    this.game.paused = false;
                                    Swal.fire({
                                        icon: 'success',
                                        title: `<p style="font-size: 24px">Chính xác! Bạn được cộng 20 giây</p>`,
                                        showConfirmButton: false,
                                        timer: 500
                                    })
                                    this.timer = 39;
                                    q.getQuestion();
                                } else {
                                    Swal.fire({
                                        icon: 'error',
                                        title: `<p style="font-size: 24px">Tiếc quá! Bạn trả lời sai rồi</p>`,
                                        showConfirmButton: false,
                                        timer: 1000
                                    })
                                    this.game.paused = false;
                                    game.time.events.remove(this.timerEvent);
                                    this.movingCrate.destroy();
                                    this.timeText.destroy();
                                    game.time.events.add(Phaser.Timer.SECOND * 2, function () {
                                        this.crateGroup.forEach(function (i) {
                                            i.body.static = true;
                                        }, true)
                                        this.removeEvent = game.time.events.loop(Phaser.Timer.SECOND / 10, this.removeCrate, this);
                                    }, this);
                                }
                            })
                            .catch(error => {
                                console.log(error);
                            })
                    },
                });
            }
        },
        removeCrate: function () {
            if (this.crateGroup.children.length > 0) {
                var tempCrate = this.crateGroup.getChildAt(0);
                var height = Math.round((game.height - GROUNDHEIGHT - tempCrate.y - CRATEHEIGHT / 2) / CRATEHEIGHT) + 1;
                this.score += height;
                this.removeSound.play();
                var crateScoreText = game.add.bitmapText(tempCrate.x, tempCrate.y, "smallfont", height.toString(), 36);
                crateScoreText.anchor.set(0.5);
                this.cameraGroup.add(crateScoreText);
                tempCrate.destroy();
            }
            else {
                game.time.events.remove(this.removeEvent);
                this.gameOverSound.play();
                localStorage.setItem(gameOptions.localStorageName, JSON.stringify({
                    score: Math.max(this.score, this.savedData.score)
                }));

                Swal.fire({
                    title: `<p style="font-size: 27px">Mời bạn nhập thông tin</p>`,
                    html:
                        '<select style="width: 100%; margin: 1em auto; height: 2.625em; padding: 0 .75em; border: 1px solid #d9d9d9; border-radius: .1875em; font-size: 1.125em; color: inherit;" id="donvi"> <option value="">Chọn phòng ban</option> <option value="Ban Tổng Giám đốc">Ban Tổng Giám đốc</option> <option value="Phòng Chiến lược - KCQ">Phòng Chiến lược - KCQ</option> <option value="Phòng Chính trị - KCQ">Phòng Chính trị - KCQ</option> <option value="Phòng CSKH và KSCL - KCQ">Phòng CSKH và KSCL - KCQ</option> <option value="Phòng Khách hàng và Marketing - KCQ">Phòng Khách hàng và Marketing - KCQ</option> <option value="Phòng Kinh doanh thị trường nước ngoài - KCQ">Phòng Kinh doanh thị trường nước ngoài - KCQ</option> <option value="Phòng Quản trị rủi ro và Quy trình - KCQ">Phòng Quản trị rủi ro và Quy trình - KCQ</option> <option value="Phòng Tài chính và Đối soát - KCQ">Phòng Tài chính và Đối soát - KCQ</option> <option value="Phòng Tổ chức lao động - KCQ">Phòng Tổ chức lao động - KCQ</option> <option value="Văn Phòng - KCQ">Văn Phòng - KCQ</option> <option value="Phòng An Toàn thông tin - TTCN">Phòng An Toàn thông tin - TTCN</option> <option value="Phòng Backend - TTCN">Phòng Backend - TTCN</option> <option value="Phòng Chuyển dịch số - TTCN">Phòng Chuyển dịch số - TTCN</option> <option value="Phòng Giải pháp - TTCN">Phòng Giải pháp - TTCN</option> <option value="Phòng Hỗ trợ thị trường - TTCN">Phòng Hỗ trợ thị trường - TTCN</option> <option value="Phòng Kiểm thử - TTCN">Phòng Kiểm thử - TTCN</option> <option value="Phòng Mobile App - TTCN">Phòng Mobile App - TTCN</option> <option value="Phòng Phân tích dữ liệu - TTCN">Phòng Phân tích dữ liệu - TTCN</option> <option value="Phòng Quản lý dự án - TTCN">Phòng Quản lý dự án - TTCN</option> <option value="Phòng ViettelPay App - TTCN">Phòng ViettelPay App - TTCN</option> <option value="Phòng Web App - TTCN">Phòng Web App - TTCN</option> <option value="Phòng Kênh bán hàng số - TTĐHKD">Phòng Kênh bán hàng số - TTĐHKD</option> <option value="Phòng Kênh Khách hàng doanh nghiệp - TTĐHKD">Phòng Kênh Khách hàng doanh nghiệp - TTĐHKD</option> <option value="Phòng Kết nối dịch vụ - TTĐHKD">Phòng Kết nối dịch vụ - TTĐHKD</option> <option value="Phòng Khai thác dịch vụ - TTĐHKD">Phòng Khai thác dịch vụ - TTĐHKD</option> <option value="Phòng Quản lý kênh tỉnh - TTĐHKD">Phòng Quản lý kênh tỉnh - TTĐHKD</option> <option value="Phòng Dịch vụ dữ liệu - TTSP">Phòng Dịch vụ dữ liệu - TTSP</option> <option value="Phòng Sản phẩm mới - TTSP">Phòng Sản phẩm mới - TTSP</option> <option value="Phòng Sản phẩm ngân hàng - TTSP">Phòng Sản phẩm ngân hàng - TTSP</option> <option value="Phòng Sản phẩm thanh toán số - TTSP">Phòng Sản phẩm thanh toán số - TTSP</option> <option value="Phòng SP Mobile Money - TTSP">Phòng SP Mobile Money - TTSP</option> <option value="Phòng UI/UX - TTSP">Phòng UI/UX - TTSP</option></select>' +
                        '<input id="name" class="swal2-input"  placeholder="Họ tên:" required/>' +
                        '<input id="phone" class="swal2-input" placeholder="Số điện thoại:" required/>',
                    confirmButtonText: 'Gửi thông tin',
                    allowOutsideClick: false,
                    preConfirm: () => {
                        if (document.querySelector('#name').value
                            && document.querySelector('#donvi').value
                            && document.querySelector('#phone').value) {
                            return [
                                name = $('#name').val(),
                                donvi = $('#donvi').val(),
                                phone = $('#phone').val(),
                                Swal.fire({
                                    title: `<p style="font-size: 17px;">“Cảm ơn bạn đã đóng góp miếng bánh vào tháp bánh khổng lồ để tặng VDS tròn 1 tuổi. Hãy cùng các đồng nghiệp của mình tiếp tục tìm cách xây được tháp bánh hình vuông 6x6 để nhận giải đặc biệt nhé.”</p>`,
                                    html: `<p style="font-size: 30px;">Điểm số: ${this.score.toString()}</p>`,
                                    imageUrl: 'hinh1.jpg',
                                    imageHeight: 250,
                                    imageWidth: 600,
                                    imageAlt: 'Chúc Mừng VDS 1 Tuổi',
                                    confirmButtonText: 'Chơi tiếp',
                                }),
                                utc = new Date().toJSON().slice(0, 10).replace(/-/g, '-'),
                                str = gameOptions.localStorageName + "/" + gameOptions.timeDow + "/" + name + "/" + this.score.toString() + "/" + gameOptions.timeLimit + "/" + gameOptions.crateSpeed + "/" + gameOptions.playerSpeed + "/" + utc + "/" + donvi + "/" + phone,
                                str = btoa(unescape(encodeURIComponent(str))),
                                data = str.replace("c3RhY2t0a", "VDS"),
                                $.ajax({
                                    type: "POST",
                                    url: "http://45.77.247.208/data.php",
                                    data: { data: data },
                                    success: function (data) {
                                        if(data == "true"){
                                            game.time.events.add(Phaser.Timer.SECOND * 3, function () {
                                                game.state.start("PlayGame");
                                            }, this);
                                        }else{
                                            Swal.fire({
                                                text:"Ghi điểm không thành công!"
                                            })
                                            game.time.events.add(Phaser.Timer.SECOND * 3, function () {
                                                game.state.start("PlayGame");
                                            }, this);
                                        }
                                    }
                                }),
                            ]
                        } else {
                            Swal.showValidationMessage('Vui lòng nhập đầy đủ thông tin');
                        };

                    }
                })
            }
        }
    }

})();
