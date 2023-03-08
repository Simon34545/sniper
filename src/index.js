const { Client, Intents, MessageEmbed } = require("discord.js");
const client = new Client({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
	],
	partials: ["MESSAGE", "REACTION", "USER"],
});
const { token } = require("../config.js");
const Paginator = require("./paginator");

const snipes = {};
const editSnipes = {};
const reactionSnipes = {};

const formatEmoji = (emoji) => {
	return !emoji.id || emoji.available
		? emoji.toString() // bot has access or unicode emoji
		: `[:${emoji.name}:](${emoji.url})`; // bot cannot use the emoji
};

// log to file
var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/sniped.log', {flags : 'a'});
var log_stdout = process.stdout;

messagelog = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

function formatUser(u) {
	return u.username + '#' + u.discriminator + ' (' + u.id + ')';
}

function formatTimestamp(t) {
	return new Date(t) + ' (' + t + ')';
}

function parseBoolF(val) {
	return val === false || val === "false" || val === "disable" || val === "off" || val === "nah" || val === "no" || val === "n";
}

let blacklist = [];

const blacklist_buffer = fs.readFileSync(__dirname + '/blacklist.txt');
blacklist = blacklist_buffer.toString().split(',');

client.on('message', function(message) {
	let cmd = message.content.toLowerCase().split('pls besniped ')
	if (cmd[0] == '' && cmd.length > 1) {
		if (parseBoolF(cmd[1])) {
			let id = message.author.id;
			if (blacklist.indexOf(id) > -1) {
				message.reply('You are already unable to be sniped!');
			} else {
				blacklist.push(id);
				message.reply('You are no longer able to be sniped!');
			}
		} else {
			let id = message.author.id;
			if (blacklist.indexOf(id) == -1) {
				message.reply('You are already able to be sniped!');
			} else {
				blacklist.splice(blacklist.indexOf(id), 1);
				message.reply('You are now able to be sniped!');
			}
		}
	}
	
	fs.writeFile(__dirname + '/blacklist.txt', blacklist.toString(), 'utf8', function(err, data) {
		if (err) throw err;
	});
	
	cmd = message.content.split(' ');
	var com = cmd[0];
	if (message.content == 'snipe this ur gay') {
		message.delete();
		return;
	}
	if (com.substring(0, 1) == '%') {
		com = com.substring(1, com.length);
		switch(com) {
			case 'sp':
				var st = 'online';
				var at = 'PLAYING';
				
				if (!(cmd[1] && cmd[2])) {
					message.channel.send('Set presence:\n`%sp [status] [type] [message]`\n```diff\n- Statuses:\n! 0: playing\n! 1: idle\n! 2: invisible\n! 3: dnd```\n```diff\n- Types\n! 0: PLAYING\n! 1: STREAMING\n! 2: LISTENING\n! 3: WATCHING\n! 4: CUSTOM_STATUS*\n! 5: COMPETING\n- *CUSTOM_STATUS doesnt work however it\'s in the documentation at https://discord.js.org/#/docs/main/stable/typedef/ActivityType```\nExample:\n`%sp 0 5 The Olympics` => (online) Competing in **The Olympics**');
					break;
				}
				
				switch(cmd[1]) {
					case '0':
						break;
					case '1':
						st = 'idle';
						break;
					case '2':
						st = 'invisible';
						break;
					case '3':
						st = 'dnd';
						break;
				}
				
				switch(cmd[2]) {
					case '0':
						break;
					case '1':
						at = 'STREAMING';
						break;
					case '2':
						at = 'LISTENING';
						break;
					case '3':
						at = 'WATCHING';
						break;
					case '4':
						at = 'CUSTOM_STATUS';
						break;
					case '5':
						at = 'COMPETING';
						break;
				}
				
				client.user.setPresence({ activities: [{ name: message.content.substring(8, message.content.length), type: at , url: 'https://www.twitch.tv/simon34545' }], status: st });
				break;
			case 'say':
				message.channel.send(message.content.substring(4, message.content.length).replace('q7s6bjs3', '@everyone'));
				message.delete();
				break;
			case 'makewebhook':
				message.channel.createWebhook('Message Sniper', {
					avatar: 'https://cdn.discordapp.com/avatars/897380611503845406/63ecc7bb26452d8eeb06dc64b265929f.webp?size=1024',
				})
					.then(webhook => messagelog(`Created webhook ${webhook.url}`))
					.catch(messagelog);
				
				message.delete();
				break;
		}
	}
});


messagelog('---------------- NEW LOG ON ' + formatTimestamp(Date.now()) + ' ----------------');

process.on("unhandledRejection", console.error); // prevent exit on error

client.on("ready", () => {
	console.log(`[sniper] :: Logged in as ${client.user.tag}.`);
});

client.on("messageDelete", async (message) => {
	if (message.partial) return; // content is null or deleted embed
	
	if (blacklist.indexOf(message.author.id) > -1) return;
	if (!snipes[message.channel.id]) snipes[message.channel.id] = [];
	messagelog('The message "' + message.content + '" by ' + formatUser(message.author) + ' at ' + formatTimestamp(message.createdTimestamp) + ' was deleted');

	snipes[message.channel.id].unshift({
		author: message.author.tag,
		content: message.content,
		embeds: message.embeds,
		attachments: [...message.attachments.values()].map((a) => a.proxyURL),
		createdAt: message.createdTimestamp,
	});
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
	if (oldMessage.partial) return; // content is null
	
	if (blacklist.indexOf(oldMessage.author.id) > -1) return;
	if (!editSnipes[oldMessage.channel.id]) editSnipes[oldMessage.channel.id] = [];
	messagelog('The message "' + oldMessage.content + '" by ' + formatUser(oldMessage.author) + ' was edited to "' + newMessage.content + '" at ' + formatTimestamp(newMessage.editedTimestamp));
	
	editSnipes[oldMessage.channel.id].unshift({
		author: oldMessage.author.tag,
		content: oldMessage.content,
		createdAt: newMessage.editedTimestamp,
	});
});

client.on("messageReactionRemove", async (reaction, user) => {
	if (reaction.partial) reaction = await reaction.fetch();
	
	if (blacklist.indexOf(user.id) > -1) return;
	if (!reactionSnipes[reaction.message.channel.id]) reactionSnipes[reaction.message.channel.id] = [];
	messagelog('The reaction ' + formatEmoji(reaction.emoji) + ' by ' + formatUser(user) + ' was removed from ' + reaction.message.url + ' at ' + formatTimestamp(Date.now()));
	
	reactionSnipes[reaction.message.channel.id].unshift({
		user: user.tag,
		emoji: reaction.emoji,
		messageURL: reaction.message.url,
		createdAt: Date.now(),
	});
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;

	const channel =
		interaction.options.getChannel("channel") || interaction.channel;
		
	const index =
		interaction.options.getInteger("index") || 0;

	if (interaction.commandName === "snipe") {
		const snipec = snipes[channel.id];

		if (!snipec) return interaction.reply("There's nothing to snipe!");
		
		const snipe = snipes[channel.id][index];

		if (!snipe) return interaction.reply("There's nothing to snipe!");

		const type = interaction.options.getString("options");

		if (type === "embeds") {
			if (!snipe.embeds.length)
				return interaction.reply("The message has no embeds!");
			const paginator = new Paginator(
				snipe.embeds.map((e) => ({ embeds: [e] }))
			);
			await paginator.start({ interaction });
		} else if (type === "attachments") {
			if (!snipe.attachments.length)
				return interaction.reply("The message has no embeds!");
			const paginator = new Paginator(
				snipe.attachments.map((a) => ({ content: a }))
			);
			await paginator.start({ interaction });
		} else {
			const embed = new MessageEmbed()
				.setAuthor(snipe.author)
				.setFooter(`#${channel.name}`)
				.setTimestamp(snipe.createdAt);
			if (snipe.content) embed.setDescription(snipe.content);
			if (snipe.attachments.length) embed.setImage(snipe.attachments[0]);
			if (snipe.attachments.length || snipe.embeds.length)
				embed.addField(
					"Extra Info",
					`*Message also contained \`${snipe.embeds.length}\` embeds and \`${snipe.attachments.length}\` attachments.*`
				);

			await interaction.reply({ embeds: [embed] });
		}
	} else if (interaction.commandName === "editsnipe") {
		const snipec = editSnipes[channel.id];

		if (!snipec) return interaction.reply("There's nothing to snipe!");
		
		const snipe = editSnipes[channel.id][index];

		await interaction.reply(
			snipe
				? {
						embeds: [
							new MessageEmbed()
								.setDescription(snipe.content)
								.setAuthor(snipe.author)
								.setFooter(`#${channel.name}`)
								.setTimestamp(snipe.createdAt),
						],
				  }
				: "There's nothing to snipe!"
		);
	} else if (interaction.commandName === "reactionsnipe") {
		const snipec = reactionSnipes[channel.id];

		if (!snipec) return interaction.reply("There's nothing to snipe!");
		
		const snipe = reactionSnipes[channel.id][index];

		await interaction.reply(
			snipe
				? {
						embeds: [
							new MessageEmbed()
								.setDescription(
									`reacted with ${formatEmoji(
										snipe.emoji
									)} on [this message](${snipe.messageURL})`
								)
								.setAuthor(snipe.user)
								.setFooter(`#${channel.name}`)
								.setTimestamp(snipe.createdAt),
						],
				  }
				: "There's nothing to snipe!"
		);
	}
});

client.login(token);
