const express = require('express');
const fetch = require('node-fetch');
const redis = require('redis');

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const client = redis.createClient(REDIS_PORT);

const app = express();

function setResponse(username, repos){
    return `<h2>${username} has ${repos}</h2>`;
}

//Make request to github for data
async function getRepos(req, res, next){
    try{
        const { username } = req.params;
        console.log('Fetching Data for ',username);

        const response = await fetch(`https://api.github.com/users/${username}`);
        const data = await response.json();
        const repos = data.public_repos;

        //Set data to Redis
        //key, expiration(1 hora = 60 * 60), data
        client.setex(username, 3600, repos);
        res.send(setResponse(username, repos))
    }catch(err){
        console.log(err);
        res.status(500);
    }
}

// Cache middleware (between request and response)
function cache(req, res, next){
    const { username } = req.params;

    client.get(username, (err, data)=>{
        if(err) throw err;
        if(data !== null){
            res.send(setResponse(username, data))
        }else{
            next();
        }
    })
}

app.get('/repos/:username', cache, getRepos);

app.listen(PORT, ()=>{
    console.log(`App listening on PORT ${PORT}`);
}); 

