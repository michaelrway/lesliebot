var Botkit = require('botkit');
var controller = Botkit.slackbot();
var request = require('request');
var cheerio = require("cheerio");

var NodeCache = require( "node-cache" );
var cache = new NodeCache();

var bot = controller.spawn({
  token: process.env.token
})

bot.startRTM(function(err,bot,payload) {
  if (err) {
    throw new Error('Could not connect to Slack');
  }else{
    console.log('connected');
  }
});

bot.typing = function(message) {
  bot.rtm.send(JSON.stringify({
      id: bot.msgcount++,
       channel: message.channel,
       type: "typing",
     }),function(err) {
       if (err) {
         console.log('Could not send RTM message...');
         logger.error(err);
       }
     });
}

////////////////////
//// OVERWRITING SOME FUNCTIONS

bot.say = function(message,cb) {
  var slack_message = {
    id: bot.msgcount++,
    type: 'message',
    channel: message.channel,
    text: message.text,
    username: message.username||null,
    parse: message.parse||null,
    link_names: message.link_names||null,
    attachments: message.attachments?JSON.stringify(message.attachments):null,
    unfurl_links: message.unfurl_links,
    unfurl_media: message.unfurl_media||null,
    icon_url: message.icon_url||null,
    icon_emoji: message.icon_emoji||null,
  }
  if (message.icon_url || message.icon_emoji || message.username ){
    slack_message.as_user = false;
  } else {
    slack_message.as_user = message.as_user || true;
  }
  if (true || message.attachments || message.icon_emoji || message.username || message.icon_url) {
    if (!bot.config.token) {
      throw new Error("Cannot use web API to send messages.")
    }
    bot.api.chat.postMessage(slack_message,function(err,res) {
      if (err) {
        if (cb) { cb(err); }
      } else {
        if (cb) { cb(null,res); }
      }
    });
  } else {
    if (!bot.rtm) {
      throw new Error("Cannot use the RTM API to send messages.")
    }
    try {
      bot.rtm.send(JSON.stringify(slack_message),function(err) {
        if (err) {
          if (cb) { cb(err); }
        } else {
          if (cb) { cb(null); }
        }
      });
    } catch(err) {
      if (cb) { cb(err); }
    }
  }
}

bot.reply = function(src,resp,cb) {
  var msg = {};
  if (typeof(resp)=='string') {
      msg.text = resp;
      msg.channel = src.channel;
  } else {
    msg = resp;
    msg.channel = src.channel;
  }
  if(src.unfurl_links != undefined){
    msg.unfurl_links = src.unfurl_links;
  }
  bot.say(msg,cb);
}

//// END OVERWRITE
////////////////////////

//////////////
/// PARSE FUNCTIONS
function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

/// END PARSE FUNCTIONS
///////////////

controller.hears(['dallas'],'direct_message,direct_mention',function(bot, message) {
  var quote = 'DALLAS IS NOT A PLACE YOU WANT TO GO.';
  quote = capitalizeFirstLetter(quote);
  bot.reply(message, "_"+quote+"_");
})

controller.hears(['houston'],'direct_message,direct_mention',function(bot, message) {
  var quote = 'The humidity in Houston is bad for my hair *';
  quote = capitalizeFirstLetter(quote);
  bot.reply(message, "_"+quote+"_");
})

controller.hears(['San Antonio'],'direct_message,direct_mention',function(bot, message) {
  var quote = 'San Antonio isn\'t far enough away  *';
  quote = capitalizeFirstLetter(quote);
  bot.reply(message, "_"+quote+"_");
})

controller.hears(['[*]'],'direct_message,direct_mention',function(bot, message) {
  var quote = 'Not necesarily a direct quote or even remotely close to one.';
  quote = capitalizeFirstLetter(quote);
  bot.reply(message, "_"+quote+"_");
})

controller.hears(['who are you', 'what are you'],'direct_message,direct_mention',function(bot, message) {
  var quote = 'I am just a bot inhabbited by the ghost of Austin icon <https://en.wikipedia.org/wiki/Leslie_Cochran|Leslie Cochran>';
  bot.reply(message, "_"+quote+"_");
})

controller.hears(['old are you', 'your age'],'direct_message,direct_mention',function(bot, message) {
  var quote = 'I was just born and I am infinite. Age is just a number.';
  bot.reply(message, "_"+quote+"_");
})

controller.hears(['why did you'],'direct_message,direct_mention',function(bot, message) {
  var quote = 'Why didn\'t you?';
  bot.reply(message, "_"+quote+"_");
})

controller.hears(['meaning of life', 'point of life', 'life\'s meaning', 'lifes meaning'],'direct_message,direct_mention',function(message) {
  var quotes = [
    '42',
    'Eat, drink, and be merry',
    'Go figure that out for yourself',
    'To build up others'
  ];

  var quote = quotes[Math.floor(Math.random()*quotes.length)];
  bot.reply(message,"_"+quote+"_");
})

controller.hears(['your favorite'],'direct_message,direct_mention',function(bot, message) {
  var quote = 'Life\'s to short to not love many things';
  bot.reply(message, "_"+quote+"_");
})



controller.hears(['^good morning'],'direct_message,direct_mention',function(bot, message) {
  var quote = 'Good morning <@' + message.user + '>!';
  bot.reply(message, quote);
})

/////////////////
////// LAKE LEVEL

var getLake = function(cb){
  cache.get( "lake", function( err, value ){
    if( !err ){
      if(value == undefined){
        request({
        uri: "http://hydromet.lcra.org/chronLL.aspx?snum=3963&sname=Travis",
        }, function(error, response, body) {
          if(error){
            cb(error)
          }else{
            var $ = cheerio.load(body);
            var dataLevel = $('table#GridView1 tr td').next().text();

            var levelLeftMath = 681 - parseFloat(dataLevel);
            var levelLeft = Math.round( levelLeftMath * 10 ) / 10;

            if(levelLeft <= 0){
              obj = {message: "_Is the lake full yet?_ \nYup!!"};
            }else{
              obj = {message: "_Is the lake full yet?_ \nNope! *" + levelLeft + "ft* To Go :swimmer:"};
            }

            cache.set( "lake", obj, function( err, success ){
              if( !err && success ){
                cb(null, obj);
              }
            });

          }
        })
      }else{
        cb(null, value);
      }
    }else{
      cb(err);
    }
  });
}

controller.hears(['^lake$','^lake level$','^is the lake full yet?$'],'ambient',function(bot, message) {
    bot.typing(message);
    getLake(function(err, msg){
      if(err){
        bot.reply(message,'Something is not right with the lake... try back later :swimmer:');
      }else{
        bot.reply(message,msg.message);
      }
    });
});

controller.hears(['lake'],'direct_message,direct_mention',function(bot, message) {
    bot.typing(message);
    getLake(function(err, msg){
      if(err){
        bot.reply(message,'Something is not right with the lake... try back later :swimmer:');
      }else{
        bot.reply(message,msg.message);
      }
    });
});

//// End Lake
//////////////////////////


/////////////////////
///// Weather

controller.hears(['weather'],'direct_message,direct_mention',function(bot, message) {
  bot.typing(message);
  request({
    uri: "http://api.openweathermap.org/data/2.5/weather?zip=78704,us&APPID=eed1091199b9823329a4f7c1ec31dfdd",
  }, function(error, response, body) {
    if(error){
      bot.reply(message, "_Something is wrong with my bones. I can't tell the weather._");
    }else{
      var data = JSON.parse(body);

      var f =(data.main.temp - 273.15)* 1.8000 + 32.00;
      f = Math.floor(f);
      var condition = data.weather[0].description;

      if(condition == 'Sky is Clear'){
        bot.reply(message, condition + ' and it\s ' + f + '°');
      }else{
        bot.reply(message, 'I\'m seeing ' + condition + ' and it\s ' + f + '°');
      }

    }
  })
})

///// Weather End
////////////////////////

//////////////////////////
///// Eat
controller.hears(['eat'],'direct_message,direct_mention',function(bot, message) {

  bot.startTask(message,function(task,conversation) {

    conversation.ask('_What kind of food do you like to eat?_',function(answer) {
      conversation.say('_Well then go eat ' + answer.text + ' and stop asking me about it!_');
      conversation.next();
    });

  });
})
///// End Eat
///////////////////////////

///////////////////////
///// Pictures

controller.hears(['picture of austin'],'direct_message,direct_mention',function(bot, message) {
  bot.typing(message);
  request({
    uri: "https://api.instagram.com/v1/tags/austinlife/media/recent?client_id=4e368275bff346ada15c0c78329c797d",
  }, function(error, response, body) {
    if(error){
      bot.reply(message, "_Something is wrong with my peepers..._");
    }else{

      var data = JSON.parse(body);

      var getPic = function(data, cb){
        var randomPic = data.data[Math.floor(Math.random()*data.data.length)];
        if(randomPic.images){
          if(randomPic.images.standard_resolution){
            cb(randomPic);
          }else{
            getPic(data, cb);
          }
        }else{
          getPic(data, cb);
        }
      }

      getPic(data, function(pic){
        bot.reply(message, pic.images.standard_resolution.url);
        bot.reply(message, '_'+pic.caption.text+'_');
      });

    }
  })
})

///// End Pictures
////////////////////

///////////////////
///// Shows

controller.hears(['shows', 'show'],'direct_message,direct_mention',function(bot, message) {
  bot.typing(message);
    request({
    uri: "http://www.austinchronicle.com/calendar/music/",
  }, function(error, response, body) {
    var $ = cheerio.load(body);
    var dataLevel = $('#Listings h2');


    if(dataLevel === null){
      bot.reply('I don\'t know what is going on tongiht');
    }else{
      var getShow = function(data, cb){
        var randShow = dataLevel[Math.floor(Math.random()*dataLevel.length)].children[0];
        var showUrl = 'http://www.austinchronicle.com'+randShow.attribs.href;
        var showName = randShow.children[0].data;

        if(showName && randShow.attribs.href){
            cb({url:showUrl, name:showName});
        }else{
          getShow(data, cb);
        }
      }

      message.unfurl_links = false;

      getShow(dataLevel, function(show){
        bot.reply(message, 'There is a <'+show.url+'|'+show.name+'> show happening tonight. \n _See more shows <http://www.austinchronicle.com/calendar/music/|here>._');
      })
    }
  });
});
///// End Shows
/////////////////////


//////////////////////////
///// Quote responses

controller.on('direct_message,direct_mention',function(bot, message) {

    var quotes = [
    "IT’S NOT HOW YOU DRESS. IT’S WHAT’S IN YOUR HEART.",
    "IF YOU’RE GONNA COMPLAIN ABOUT SOMETHING AND A VENUE OPENS WHERE YOU CAN DEAL WITH IT, IF YOU DON’T TAKE THAT OPPORTUNITY, THEN YOU STOP BEING A PROTESTER. YOU STOP BEING AN ACTIVIST. ALL YOU DO IS BECOME JUST A COMPLAINER.",
    "LET’S KEEP AUSTIN AUSTIN.",
    "I JUST GOTTA LEARN HOW TO SAY YES MORE OFTEN.",
    "IN A WAY, I’M A REBEL BECAUSE WE’RE ALL TAUGHT TO CONFORM… I’M VERY NORMAL FOR WHO I AM, BUT I’M NOT NORMAL BY OTHER PEOPLE’S GUIDELINES.",
    "NO MATTER WHAT YOU DO IN LIFE, BE HAPPY WHERE YOU’RE AT. EVEN IF YOU GET TO THE BOTTOM OF THE RUNG, FIND WAYS TO ENJOY THAT.",
    "I’M VERY HAPPY WITH HOW PEOPLE SEE ME AND I KNOW THAT, WHEN I’M NOT AROUND ANYMORE, THEY WILL STILL SEE ME IN THIS WAY AND I’M VERY COMFORTABLE WITH THAT."];

    var quote = quotes[Math.floor(Math.random()*quotes.length)];
    quote = capitalizeFirstLetter(quote);

    bot.reply(message,"_"+quote+"_");
});

///// End Quotes
////////////////////////////
