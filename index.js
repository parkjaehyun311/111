const express = require('express');
const app = express();
const mysql = require('mysql');
const dbConfig = require('./config/db.js')
const connection = mysql.createConnection(dbConfig);

app.use(express.urlencoded({extended:true}));
app.set("view engine", "ejs");
app.set("views","./layout");

app.use(express.static("public"));


app.set('port', process.env.PORT || 3003);
app.get("/", (req, res) => {
    let datas = [];
    let page = 1;
    if (req.query && req.query.page) {
        page = req.query.page;
    }
    const cntPerPage = 9;

    connection.query('SELECT count(*) as total FROM article where board_id = 1', (error, rows) => {
        if (error) throw error;

        let totalCnt = rows[0]['total'];
        let maxPage = Math.floor(totalCnt / cntPerPage) + ((totalCnt % cntPerPage) > 0 ? 1 : 0);
        console.log("Page", page, "maxpage", maxPage, "total", totalCnt);

        if (page < 0) {
            res.redirect("./?page=1");
        } else if (page > maxPage + 1) {
            res.redirect("./?page=" + maxPage);
        } else {
            connection.query('SELECT * FROM article WHERE board_id = 1 ORDER BY article_id DESC limit ?,?',
                [(page - 1) * cntPerPage, cntPerPage], (error, rows) => {
                    if (error) throw error;

                    for (let i = 0; i < rows.length; i++) {
                        let date = new Date(rows[i]['reg_date']);
                        const dateStr = date.getFullYear() + "." + date.getMonth() + "." + date.getDate() + " " + date.getHours() + ":" + date.getMinutes();

                        datas.push({
                            'id': rows[i]['article_id'],
                            'date': dateStr,
                            'title': rows[i]['title'],
                            'content': rows[i]['content'],
                        })
                    }
                    res.render('board/listPage', {
                        "datas": datas,
                        "cnt": datas.length,
                        "prevPage": page - 1 > 0 ? page - 1 : 1,
                        "nextPage": page + 1 > maxPage ? maxPage : page + 1,
                    });
                });
        }
    });
});


app.get("/test", (req,res)=>{
    res.end("<html><head><title>Test title</title></head>\
    <body><h1>Test</h1></body></html>");
})

app.get("/index", (req,res)=>{
    res.sendFile(__dirname + "/public/html/index.html");
})

app.get("/class", (req,res)=>{
    res.sendFile(__dirname + "/public/html/class.html")
})

app.get("/view", (req,res)=>{
    let articleId = req.query.id;
    connection.query("SELECT * FROM article WHERE board_id=1 and article_id = ?", [articleId], (error, rows)=>{
        if(error) throw error;

        let date = new Date(rows[0]['reg_date']);
        const dateStr = date.getFullYear() + "." + date.getMonth() + "." + date.getDate() + " " + date.getHours() + ":" + date.getMinutes();
        let boardViewDate = {
            title : rows[0]['title'],
            content : rows[0]['content'],
            date : dateStr,
            id : rows[0]['article_id'],
        };

        res.render('board/viewpage', {
            'article': boardViewDate,
        })
    })
   
})

app.get("/write", (req,res)=>{

    res.render('board/writepage');
})

app.post("/write", (req,res)=>{

    connection.query("SELECT * FROM board where board_id = 1", (error, rows)=>{
        if(error) throw erros;
        const dbCryptKey = rows[0]['crypt_key'];

        console.log("req body data :", req.body);

        if(dbCryptKey == req.body.code){
            let title = req.body.title;
            let content = req.body.content;
            
            connection.query("INSERT INTO article (board_id, title, content, reg_date) VALUES (1,?,?,?)",
                            [title, content, new Date()], (error,rows)=>{

                if(error) throw errors;

                res.redirect("./view?id="+rows.insertId);
             })
        }
        else {
            res.status(400).json({ error: '코드가 잘못되었습니다' });
        
            // res.redirect("/write");
        }
        
    })
})

app.listen(app.get('port'), ()=>{
    console.log("express serven running on port 3003");
});

app.get("/signup", (req, res) => {
    res.render('board/signup'); 
});

app.post("/signup", (req, res) => {
    const { username, password } = req.body;

    
    connection.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], (error, results) => {
        if (error) throw error;
        console.log('Received data - username:', username, 'password:', password);
        res.redirect("/login");
    });
});


const session = require("express-session");
app.use(session({
    secret: "webstudy",
    resave: false,
    saveUninitialized: true
}));

function requireLogin(req, res, next) {
    if (req.session.username) {
        next();
    } else {
        res.redirect("/login");
    }
}


app.get("/login", (req, res) => {
    res.render("board/login"); // login.ejs 파일을 렌더링하여 클라이언트에 전송
});




app.post("/login", (req, res) => {
    const { username, password } = req.body;

    connection.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (error, results) => {
        if (error) throw error;

        if (results.length > 0) {
            req.session.userId = results[0].userId;
            res.locals.user = req.session.userId;  // 세션에 저장된 사용자 ID를 전역 변수로 설정
            res.redirect("/");
        } else {
            res.redirect("/login");
        }
    });
});

// 기존 코드 중 미들웨어 수정
app.use((req, res, next) => {
    console.log("Session User:", req.session.userId); // 이 줄을 추가


    next();
});





app.get("/profile", requireLogin, (req, res) => {
    // 로그인이 필요한 페이지
    res.render("profile");
});


