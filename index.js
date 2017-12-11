const readline = require('readline');
const Discord = require('discord.js');
const parrot = require('./parrot');
const auth = require('./auth.json');

const client = new Discord.Client();
const main_channel_id = '389456066745729027';
const test_channel_id = '389466355059130368';
let guild, main_channel, test_channel;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);

  client.guilds.map((guild) => {
    if (!guild.available) throw new exception;
    main_channel = guild.channels.find('id', main_channel_id);
    test_channel = guild.channels.find('id', test_channel_id);
    console.log(test_channel.name);
    // if (test_channel != null)
      // test_channel.send('Protocol Exterminate All Humans Initiated');
    blaze_it();
    parrot.get_history(guild).then(live_message);
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

function blaze_it() {
  let now = new Date();
  let blaze_time = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(),
    16, 20, 0);
  let delay = blaze_time - now;
  if (delay < 0)
    delay += 1000 * 60 * 60 * 24;

  setTimeout(() => {
    main_channel.send('420BLAZEIT');
    setTimeout(blaze_it, 10000);
  }, delay);
}

client.on('message', msg => {
  if (msg.author.bot) return;
  if (msg.content === 'ping') {
    msg.reply('pong!');
  }
  if (msg.content === '!time') {
    let date = new Date();
    msg.channel.send(`The current time is ${date.toLocaleString()}`);
  }
  if (msg.content === '!speak') {
    msg.channel.send(parrot.speak());
  }
  if (msg.content.toLowerCase() === 'good bot') {
    msg.reply('Thanks!');
  }
  // Echo test
  // if (!msg.author.bot &&
  //    msg.channel.id === test_channel.id)
  //   msg.channel.send(msg.content);
});

// client.on('messageDelete', msg => {
//   msg.reply('You can\'t escape your past!');
// });

client.login(auth.token);
