// A markov chain that tries to speak base on past user speech
// Steven Zhu

const fs = require('fs');

let chain_start = {};
chain_start.children = [];
chain_start.branches = 0;
let great_chain = {};

let output = '';

async function get_history(guild) {
  let user_messages = {};
  let all_messages = [];

  const channels_histories = await Promise.all(guild.channels
        .filter(channel => channel.fetchMessages)
        .map(channel => channel.fetchMessages()));

  channels_histories.map(channel_history => {
    channel_history.map(message => {
      const username = message.author.username;
      if (message.author.bot)
        return;
      if (!user_messages[username]) {
        user_messages[username] = [];
      }
      // Command handler
      if (message.content[0] === '!') return;
      sentences = message.content.split('.');
      for (sentence of sentences) {
        sanitized = sentence.replace(/[^a-z\s]/gi, '').trim()
        .toLowerCase().split(' ');
        if (sanitized.length > 1)
          user_messages[username].push(sanitized);
      }
    });
  });

  for (const user in user_messages) {
    // console.log(user);
    for (const message of user_messages[user]) {
      // console.log(message);
      all_messages.push(message);
    }
  }

  generate_chain(all_messages);
  // for (const message of all_messages) {
  //   console.log(message);
  // };
}

function generate_chain(messages) {
  for (message of messages) {
    // console.log(message);
    for (i = 0 ; i < message.length-1; i++) {
      if (!great_chain[message[i]]) {
        initialize_node(message[i])
      }
      if (!great_chain[message[i+1]])
        initialize_node(message[i+1]);
      if (!great_chain[message[i]].children[message[i+1]]) {
        great_chain[message[i]].children[message[i+1]] = 1;
      } else {
        great_chain[message[i]].children[message[i+1]] += 1;
      }
      // great_chain[message[i+1]].parent += 1;
      great_chain[message[i]].branches += 1;
      if (i == 0) {
        if (!chain_start[message[i]])
          chain_start.children[message[i]] = 0;
        chain_start.children[message[i]] += 1;
        chain_start.branches += 1;
      }
      if (i == message.length-2)
        great_chain[message[i+1]].children['.'] += 1;
    }
  }
  // console.log(chain_start);
}

function initialize_node(word) {
  great_chain[word] = {};
  great_chain[word].children = [];
  great_chain[word].branches = 0;
  // great_chain[word].parent = 0;
  // great_chain[word].end = 0;
}

function speak(length) {
  output = '';
  let num = Math.random();
  for (child in chain_start.children) {
    num -= chain_start.children[child]/chain_start.branches;
    if (num < 0) {
      output = output.concat(child + ' ');
      next_word(child, length);
      break;
    }
  }
  if (output.length > 0)
    return output;
  else
    return speak(length);
    // return 'Sorry, I don\'t know enough words :(';
}

function next_word(word, length) {
  if (length === 0 || great_chain[word].branches === 0)
    return;
  let num = Math.random();
  for (child in great_chain[word].children) {
    num -= great_chain[word].children[child]/great_chain[word].branches;
    if (num < 0) {
      output = output.concat(child + ' ');
      return next_word(child, length-1);
    }
  }
}

module.exports = {get_history, speak};
