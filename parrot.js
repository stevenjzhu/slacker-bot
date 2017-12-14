// A markov chain that tries to speak base on past user speech
// Steven Zhu

const fs = require('fs');
const filename = '_cache.json';
const MAX_LENGTH = 20;
const RANGE = 100;
// Speical tokens
const START = '^';
const END = ['.','?','!'];
const DEFAULT_END = '.';
const NUM = '#';

let great_chain;
let last_keys;
let output;

function initialize_chain(guild) {
  fs.readFile(guild.id + filename, (err, data) => {
    if (err == null) {
      console.log('Loading cache...');
      res = JSON.parse(data);
      great_chain = res.chain;
      last_keys = res.keys;
    }
    else {
      console.log('No cache found.');
      great_chain = {};
      last_keys = {};
    }

    update_chain(guild);
  })
}

async function update_chain(guild) {
  if (!great_chain[START])
    initialize_node(START);
  for (end of END) {
    if (!great_chain[end])
      initialize_node(end);
  }
  if (!great_chain[NUM])
    initialize_node(NUM);
  let all_messages = await get_history(guild);

  console.log(`Retrieved ${all_messages.length} messages.`);
  generate_chain(all_messages);

  console.log('Saving chain...');
  let file = {
    'chain': great_chain,
    'keys': last_keys
  }
  fs.writeFile(guild.id + filename, JSON.stringify(file),
  (err) => {
    if (err) throw err;
  })
  console.log('Chain saved.');
}

function initialize_node(word) {
  great_chain[word] = {};
  great_chain[word].children = {};
  great_chain[word].branches = 0;
}

async function get_history(guild) {
  let user_messages = {};
  let all_messages = [];
  let text_channels = guild.channels.filter(channel => channel.type === 'text');

  const channels_histories = await Promise.all(
    text_channels.map((channel) => {
      let key;
      if (last_keys[channel.id])
        key = last_keys[channel.id];
      else
        key = channel.createdTimestamp;

      last_keys[channel.id] = channel.lastMessageID;
      return get_old_messages(channel, key);
    })
  );

  async function get_old_messages(channel, firstKey) {
    let res = await channel.fetchMessages({limit:100, after:firstKey});
    if (res.size === 100)
      res = res.concat(
        await get_old_messages(channel, res.firstKey())
      );
    return res;
  }

  channels_histories.map(channel_history => {
    // console.log(channel_history.size);
    channel_history.map(message => {
      const username = message.author.username;
      if (message.author.bot)
        return;
      if (!user_messages[username]) {
        user_messages[username] = [];
      }
      // Command handler
      if (message.content[0] === '!' ||
      message.content === 'ping' ||
      message.content.toLowerCase() === 'good bot' ||
      message.content.toLowerCase() === 'bad bot') return;

      // regex to strip urls, credit to regextester.com
      // https://www.regextester.com/20
      let pattern = new RegExp('((http[s]?|ftp):\\/)?\\/?([^:\\/\\s]+)' +
      '((\\/\\w+)*\\/)([\\w\\-\\.]+[^#?\\s]+)(.*)?(#[\\w\\-]+)?', 'gi');

      let sentences = message.content.replace(pattern, '')
        .replace(/:\w+:|:[^ ]+/g, '')
        .replace(/([,;:.!?])/g, ' $1')
        .split(/([^.!?]+[.!?])/g);
      for (sentence of sentences) {
        if (sentence === '') continue;
        let sanitized = sentence.replace(/[^0-9a-z',:;.!?]+/gi, ' ')
        .replace(/\s+/g, ' ').trim().toLowerCase().split(' ');
        if (sanitized.length > 1)
          user_messages[username].push(sanitized);
      }
    });
  });

  for (const user in user_messages) {
    for (const message of user_messages[user]) {
      all_messages.push(message);
    }
  }

  return all_messages;
}

function generate_chain(messages) {
  console.log('Generating chain...');
  let current_word;
  let next_word;
  for (message of messages) {
    if (isNaN(message[0]))
      next_word = message[0];
    else
      next_word = NUM;

    if (great_chain[START].children[next_word])
      great_chain[START].children[next_word] += 1;
    else
      great_chain[START].children[next_word] = 1;
    great_chain[START].branches += 1;

    for (i = 0 ; i < message.length-1; i++) {
      // Check if word is number
      if (isNaN(message[i]))
        current_word = message[i];
      else
        current_word = NUM;
      if (isNaN(message[i+1]))
        next_word = message[i+1];
      else
        next_word = NUM;

      if (!great_chain[current_word])
        initialize_node(current_word)
      if (!great_chain[next_word])
        initialize_node(next_word);

      if (great_chain[current_word].children[next_word])
        great_chain[current_word].children[next_word] += 1;
      else
        great_chain[current_word].children[next_word] = 1;

      great_chain[current_word].branches += 1;

    }

    if (!END.includes(next_word)) {
      if (great_chain[next_word].children[DEFAULT_END])
        great_chain[next_word].children[DEFAULT_END] += 1;
      else
        great_chain[next_word].children[DEFAULT_END] = 1;
      great_chain[next_word].branches += 1;
    }
  }
  console.log('Chain updated.');
}

function speak() {
  output = '';
  next_word(START, 0);
  if (output.length > 1)
    return output;
  else
    return speak(length);
}

function next_word(word, length) {
  if (length === MAX_LENGTH || great_chain[word].branches === 0)
    return;

  let num = Math.random();
  let branches = great_chain[word].branches;
  for (child in great_chain[word].children) {
    num -= great_chain[word].children[child] / branches;
    if (num < 0) {
      if (!END.includes(child))
        output = output.concat(' ');

    switch(child) {
      case 'i':
        output = output.concat('I');
        break;
      case '#':
        output = output.concat(Math.round(Math.random() * RANGE));
        break;
      default:
        output = output.concat(child);
    }
    return next_word(child, length+1);
  }
  }
  console.log(num);
  output = output.concat(' FIXME!');
  return;
}

module.exports = {initialize_chain, update_chain, speak};
