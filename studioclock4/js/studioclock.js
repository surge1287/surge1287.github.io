var refresh_rate = 100;
var prenews_length = 0;
var prenews_start = 0;
var news_length = 0;
var loaded = new Date();
var skew = 0;
var last_update = null; // the date and time the page was last updated
var to = null; // timeout object;
var d = new Date();
var last_hour_got = d.getHours(); // the last hour that was gotten (so we can update on the hour)
var current_song_artist = ""; // works around the artist / title bug
var current_song_title = "";
var globalData = null;

function fmt00(x) {
	// fmt00: Tags leading zero onto numbers 0 - 9.
	// Particularly useful for displaying results from Date methods.
	//
	var y = 0 + Math.abs(parseInt(x));
	if (y < 10) { y = "0"+y;}
	return y;
}

function myTime() {
	var d = new Date();
	d.setSeconds(d.getSeconds() + skew);
	return fmt00(d.getHours())+":"+fmt00(d.getMinutes())+":"+fmt00(d.getSeconds());
}

function displayCountdown( count ) {
	//alert(document.body.style.backgroundImage);
	var countSpan = $("#countdown");
	$("#no_news").css('display', "none");
	countSpan.css('display', "");


	var min = fmt00(Math.floor(count / 60) );
	var sec = fmt00(count % 60);
	var tsec = Math.floor(10 * (count - Math.floor(count)));

	if (count <= 0) {
		// Just before news
		countSpan.html("00.0");
		countSpan.css('color', "red");
	} else if (count < 60) {
		countSpan.html(sec + "." + tsec);
		if (count < 5) {
			countSpan.css('color', "orange");
		} else if (count < 10) {
			countSpan.css('color', "yellow");
		} else if (count < 30) {
			countSpan.css('color', "#66FF66");
		} else {
			countSpan.css('color', "#CCFFFF");
		}
	} else {
		countSpan.html(min + ":" + sec);
		countSpan.css('color', "white");
	}
}

function getSecs() { // gets the exact number of seconds past the hour
   var d = new Date();
   return (d.getMinutes() * 60 + d.getSeconds() + skew + d.getMilliseconds() / 1000);
}

function update() {
	console.log(globalData);
	var d = new Date();

	var secs = getSecs();

	if (last_hour_got != d.getHours()) {
		last_hour_got = d.getHours();
		
		if (to != null) {
			clearTimeout(to);
		}
		get_globalData();
	}

	//var prog = document.getElementById("prog");

	if(globalData != null && globalData.news_off_text != "" && secs > news_length){

		var countSpan=document.getElementById("countdown");
		countSpan.style.display = "none";
		var no_news=document.getElementById("no_news");
		no_news.style.display = "";
		no_news.innerHTML = globalData.news_off_text;

	} else {
		if (secs < news_length + 15) {
			// In News
			//var perc = secs / news_length
			//if(perc > 1) perc = 1;
			//prog.style.width = (perc * 100) + "%";
			displayCountdown(news_length - secs);
		} else {
			// Pre-news
			//var perc = secs / prenews_start
			//if(perc > 1) perc = 1;
			//prog.style.width = (perc * 100) + "%";
			displayCountdown(prenews_start - secs);
		}
	}

	var timeSpan = $("#time");
	timeSpan.html(myTime());

	if (last_update != null) {
		var mins = d.getMinutes();
		var lastMins = last_update.getMinutes();
		diff = mins - lastMins;
		if (diff < 0) diff = 60 + diff;

		if (diff >= 3) document.location.reload(true); // if ajax fails - refresh the page
	}
}

function get_globalData(){

	$.get("https://www.surgeradio.co.uk/studioclock/data", function(data) {
		globalData = data;
		console.log(globalData);
		var server_time = Date.parse(globalData.datetime);
		var client_time = new Date().getTime();

		if (use_server_time) {
			skew = parseFloat(((server_time - client_time) / 1000) + additional_skew); // number of secs the server is ahead of the client
		} else {
			skew = additional_skew;
		}
		//alert(skew);

		// assign / update variables
		prenews_length = globalData.prenews_length;
		prenews_start = 3600 - prenews_length;
		news_length = parseFloat(globalData.news_length)
				  + parseFloat(globalData.postnews_length)
				  + parseFloat(globalData.adverts_length)
				  + parseFloat(news_length_fudge);

		last_update = new Date();

		// print the last updated time so we know if its still alive!
		//          e("last_update", last_update.toString()+" <span style=\"color: gray\">("+globalData.extrainfo+")</span>");
		$("#last_update").html(last_update.toString()); // people are reading out the 'extrainfo' onair and i don't like it


		if (!globalData.source) globalData.source = "Unknown";

		var no_show = false;
		if (!globalData.programme_name) {
			globalData.programme_name = "No Show Scheduled";
			no_show = true;
		}

		if (!globalData.programme_djs) globalData.programme_djs = "No DJs Scheduled";

		$("#source").html(globalData.source);

		in_news = (getSecs() <= news_length); // in the news?

		var programme_name_title = "Show Name:";
		var programme_djs_title = "Show DJs:";
		var programme_name = globalData.programme_name;
		var programme_djs = globalData.programme_djs;


		var dont_change = false;

		// if on the jukebox, not in the news and no show is scheduled
		if(globalData.source == "Jukebox" && !in_news && no_show) {
		  // show the current now playing - looks cool
			if(current_song_title != globalData.song_title){
				programme_name_title = "Now Playing:";
				programme_djs_title = "&nbsp;";
				programme_name = globalData.song_artist;
				programme_djs = globalData.song_title;
				current_song_artist = globalData.song_artist;
				current_song_title = globalData.song_title;
			} else {
				dont_change = true;
			}
		}

		if(globalData.source != "Jukebox" && getSecs() > 60*45){
			programme_djs_title = "Up Next:";
			programme_djs = "No Show Scheduled";
			if (globalData.upnext) programme_djs = globalData.upnext;
		}

		if (!dont_change) {
			$("#programme_name_title").html(programme_name_title);
			$("#programme_djs_title").html(programme_djs_title);
			$("#programme_name").html(programme_name);
			$("#programme_djs").html(programme_djs);
		}


		$("#adverts_titles").html(globalData.adverts_titles);
		var htmlAdvertBit = $("#adverts-bit");
		if(globalData.adverts_titles == 'None'){
			htmlAdvertBit.css('display', 'none');
		} else {
			htmlAdvertBit.css('display', '');
		}
		
		$("#motd").html(globalData.motd);
		resize_motd();
		$("#date").html(globalData.date);
		//          e("last_crash", globalData.lastcrash);
	}, "json");

	to = setTimeout(get_globalData, 30000);
}

function resize_motd() {
	var motd = $("#motd-div");
	var motd_offest = motd.offset();
	var info = $("#info-div");
	var size = 34;
	do {
		motd.css('fontSize', size + 'px');
		var motd_bottom = motd.offset().top + motd.outerHeight();
		var info_top = info.offset().top;
		size -= 2;
		//alert(motd_bottom +" vs "+info_top);
		if (size < 0) break;
	} while (motd_bottom > info_top);
}

function refresh_func() {
	update();
}

$(document).ready(function() {
	get_globalData();
	setInterval(refresh_func, refresh_rate);
});