const readline = require('readline');
const path = require('path')

const Discord = require('discord.js');
const express = require('express')
const moment = require('moment-timezone');
const parrot = require('./parrot');

const client = new Discord.Client();
const main_channel_id = '389456066745729027';
const test_channel_id = '389466355059130368';
let guild, main_channel, test_channel;

const time_zone = 'America/Chicago';

// Need to bind to Heroku port
const PORT = process.env.PORT || 5000
express()
  // .use(express.static(path.join(__dirname, 'public')))
  // .set('views', path.join(__dirname, 'views'))
  // .get('/', (req, res) => res.render('pages/index'))
.listen(PORT, () => console.log(`Listening on ${ PORT }`))

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);

  client.guilds.map((guild) => {
    if (!guild.available) throw new exception;
    main_channel = guild.channels.find('id', main_channel_id);
    test_channel = guild.channels.find('id', test_channel_id);
    // console.log(test_channel.name);
    if (!process.env.PORT) {
      live_message();
    } else {
      test_channel.send('Slacker-bot online.');
      parrot.initialize_chain(guild);
      blaze_it();
      sleep_warning();
    }
  });
});

function live_message() {
  const input = readline.createInterface(process.stdin, process.stdout);
  input.setPrompt('Message: ');
  input.prompt();
  input.on('line', (line) => {
    input.prompt();
    test_channel.send(line);
  })
}

function get_time_until(hour, minute, second) {
  let now = moment.tz(time_zone);
  let target = now.clone();
  target.hours(hour);
  target.minutes(minute);
  target.seconds(second);
  let delay = target.utc() - now.utc();
  if (delay < 0)
    delay += 1000 * 60 * 60 * 24;
  return delay;
}

function sleep_warning() {
  client.setTimeout(() => {
    test_channel.send('Slacker-bot sleeping in 60 seconds.');
    client.setTimeout(sleep_warning, 10000);
  }, get_time_until(1, 59, 0));
}

function blaze_it() {
  client.setTimeout(() => {
    main_channel.send('420BLAZEIT');
    client.guilds.map((guild) => {
      parrot.update_chain(guild);
    });
    client.setTimeout(blaze_it, 10000);
  }, get_time_until(16, 20, 0));
}

function format_time(delay, event) {
  let hour = Math.round(delay / (1000*60*60));
  delay %= 1000*60*60;
  let minute = Math.round(delay / (1000*60));
  delay %= 1000*60;
  let second = Math.round(delay / 1000);
  return `Time until ${event} is ${hour} hour, ${minute} minute, and ${second} seconds.`;
}

client.on('message', msg => {
  if (msg.author.bot) return;
  if (!process.env.PORT) return;
  switch (msg.content.toLowerCase()) {
    case 'ping':
      msg.reply('pong!');
      break;
    case '!time':
      let time = moment.tz(time_zone);
      msg.channel.send(
        `The current time is ${time.format('YYYY-MM-DD hh:mm:ss')} CST`);
      break;
    case '!sleep_time':
      msg.channel.send(format_time(get_time_until(2,0,0), 'sleep'));
      break;
    case '!blaze_time':
      msg.channel.send(format_time(get_time_until(16,20,0), '420'));
      break;
    case '!speak':
      msg.channel.send(parrot.speak());
      break;
    case 'good bot':
      msg.reply('thanks!');
      break;
    case 'bad bot':
      msg.reply('sorry :(');
      break;
    case 'default':
  }
  // Echo test
  // if (!msg.author.bot &&
  //    msg.channel.id === test_channel.id)
  //   msg.channel.send(msg.content);
});

// Disconnect handler
// client.on('disconnect', event => {
//   console.log(typeof(event));
//   console.log(event);
//   test_channel.send('Slacker-bot offline.');
// })

// client.on('messageDelete', msg => {
//   msg.reply('You can\'t escape your past!');
// });

let token;
if (process.env.AUTH_TOKEN) {
  token = process.env.AUTH_TOKEN;
}
else {
  const auth = require('./auth.json');
  token = auth.token;
}
client.login(token);
