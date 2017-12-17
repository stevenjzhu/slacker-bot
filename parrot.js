// A markov chain that tries to speak base on past user speech
// Steven Zhu

const fs = require('fs');

const msg_filename = '_msg_cache.json';
const filename = '_chain_cache.json';
const MAX_LENGTH = 20;
const RANGE = 100;
// Speical tokens
const START = '^';
const MID = [',',';',':'];
const END = ['.','?','!'];
const DEFAULT_END = '.';
const NUM = '#';

let raw_messages;
let processed_messages;
let great_chain;
let last_keys;
let output;

function initialize_chain(guild) {
  // read saved messages
  fs.readFile(guild.id + msg_filename, (err, data) => {
    if (err == null) {
      console.log('Loading msg cache...');
      res = JSON.parse(data);
      raw_messages = res.msgs;
      great_chain = {};
      last_keys = res.keys;
    }
    else {
      console.log('No cache found.');
      raw_messages = {};
      great_chain = {};
      last_keys = {};
    }
    processed_messages = [];

    update_chain(guild);
  })

  // Read saved chain
  // fs.readFile(guild.id + filename, (err, data) => {
  //   if (err == null) {
  //     console.log('Loading chain cache...');
  //     res = JSON.parse(data);
  //     great_chain = res.chain;
  //     last_keys = res.keys;
  //   }
  //   else {
  //     console.log('No cache found.');
  //     great_chain = {};
  //     last_keys = {};
  //   }
  //
  //   update_chain(guild);
  // })
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
  await update_history(guild);
  console.log('Saving raw msgs...');
  let file = {
    'msgs': raw_messages,
    'keys': last_keys
  }
  fs.writeFile(guild.id + msg_filename, JSON.stringify(file),
  (err) => {
    if (err) throw err;
  })
  console.log('Raw msgs saved.');

  // console.log(`Currently learning from ${raw_messages.length} raw messages.`);
  console.log('Processing messages...');
  process_messages();
  console.log('Processing finished.');
  // console.log(raw_messages);
  // console.log(processed_messages);

  console.log('Generating chain...');
  for (user in processed_messages)
    generate_chain(processed_messages[user]);
  console.log('Chain updated.');

  // console.log('Saving chain...');
  // let file = {
  //   'chain': great_chain,
  //   'keys': last_keys
  // }
  // fs.writeFile(guild.id + filename, JSON.stringify(file),
  // (err) => {
  //   if (err) throw err;
  // })
  // console.log('Chain saved.');
}

function initialize_node(word) {
  great_chain[word] = {};
  great_chain[word].children = {};
  great_chain[word].branches = 0;
}

async function update_history(guild) {
  console.log("Updating log...");
  let text_channels = guild.channels.filter(channel => channel.type === 'text');

  await Promise.all(
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

  console.log("Log updated.");

  async function get_old_messages(channel, firstKey) {
    let res = await channel.fetchMessages({limit:100, after:firstKey});
    populate_raw_message(res);
    if (res.size === 100)
      await get_old_messages(channel, res.firstKey());
  }
}

const blacklist = ['ping', 'good bot', 'bad bot'];
function populate_raw_message(messages) {
  messages.map((message) => {
    // Command handler
    if ((message.author.bot || message.content[0] === '!' ||
    blacklist.includes(message.content.toLowerCase()))) return;

    const username = message.author.username;
    if (!raw_messages[username]) {
      raw_messages[username] = [];
    }
    raw_messages[username].push(message.content);
  });
}

function process_messages() {
  for (user in raw_messages) {
    processed_messages[user] = [];
    for (message of raw_messages[user]) {
      // regex to strip urls, credit to regextester.com
      // https://www.regextester.com/20
      let pattern = new RegExp('((http[s]?|ftp):\\/)?\\/?([^:\\/\\s]+)' +
      '((\\/\\w+)*\\/)([\\w\\-\\.]+[^#?\\s]+)(.*)?(#[\\w\\-]+)?', 'gi');

      let sentences = message.replace(pattern, '')
        // strips emotes
        .replace(/:\w+:|[:;][^\s]+|\s\w[:;]/g, '')
        // pad spaces for division
        .replace(/(["*_,;:.!?])/g, ' $1 ')
        // Handles Chrisitan's apostrophes
        .replace('’', '\'')
        // strips anything not a word
        .replace(/([^a-z-'\s]+[a-z-']+|[a-z-']+[^a-z-'\s]+)\S*/gi, '')
        // split based on ending tokens
        .split(/([^.!?]+[.!?])/g);

      for (sentence of sentences) {
        if (sentence === '') continue;
        let sanitized = sentence.replace(/[^\w-',:;.!?]+/gi, ' ')
        .replace(/\s+/g, ' ').trim().toLowerCase().split(' ');
        if (sanitized.length > 1 &&
          !END.includes(sanitized[1]))
          processed_messages[user].push(sanitized);
      }
    }
  }
}

function generate_chain(messages) {
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

    if (!END.includes(next_word) && !MID.includes(next_word)) {
      if (great_chain[next_word].children[DEFAULT_END])
        great_chain[next_word].children[DEFAULT_END] += 1;
      else
        great_chain[next_word].children[DEFAULT_END] = 1;
      great_chain[next_word].branches += 1;
    }
  }
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
