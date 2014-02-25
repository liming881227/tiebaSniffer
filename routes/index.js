
/*
 * GET home page.
 */
var http = require("http");
var cheerio = require("cheerio");
var iconv = require('iconv-lite');
var BufferHelper = require('bufferhelper');//用于拼接BUffer。防止中文单词断裂
var process = require('child_process');
var fs = require('fs');
var Tiezi = require('../models/tiezi.js');


// Utility function that downloads a URL and invokes
// callback with the data.
function download(url, callback) {
  http.get(url, function(res) {
    var bufferHelper = new BufferHelper();
    res.on('data', function (chunk) {
      	bufferHelper.concat(chunk);
    });
    res.on("end", function() {
    	var data = iconv.decode(bufferHelper.toBuffer(), 'GBK');
      	callback(data);
    });
  }).on("error", function() {
    callback(null);
  });
}

function sendMail(title, content){
	content = content.replace(/"/g,"\\\"");

	var str = 'echo "' + content + '"|mail -s "$(echo "' + title + '\nContent-Type: text/html; charset=UTF-8")" wzhscript@126.com';
	process.exec(str);
}


function sendMailF(title, content){
	var filename = "mail.txt";

	fs.open( filename, 'w', 0666, function(e, fd) {
	    if(e) {
	        console.log('错误信息：' + e);
	    } else {
	        fs.write(fd, content, 0, 'utf8', function(e) {
	            if(e) {
	                console.log('出错信息：' + e);
	            } else {
	                fs.closeSync(fd);

	                var str = 'mail -s "$(echo "' + title + '\nContent-Type: text/html; charset=UTF-8")" wzhscript@126.com <'+filename;
	                process.exec(str);
	            }
	        });
	    }
	});
}

function sendTiezi(tiezi){
	sendMail(tiezi.title,tiezi.content);
}

function tackleTiezi(title, content){
	var newTiezi = new Tiezi({
		title: title,
		content: content
	});
	// newTiezi.save();
	Tiezi.findByTitle(newTiezi.title, function(err, tiezi){
		if(tiezi.length > 0){
			return;
		}
		//如果不存在，则新增帖子
		newTiezi.save(function(err, tiezi){
			if(err){
				console.log("err: fail to save tiezi "+ newTiezi.title);
			}

			sendTiezi(tiezi);
		});
	});
}

exports.index = function(req, res){
  res.render('index', { title: 'TiebaSniffer' });
};

exports.start = function(req, res){
	var url = "http://tieba.baidu.com/f?kw=%C3%A7%BB%C4%BC%CD";
	res.send("started");
	var count = 0;
	setInterval(function(){
		download(url, function(data) {
		  if (data) {
		    var $ = cheerio.load(data);
		    console.log("count = "+(count++));
		    $("ul#thread_list img[src*='zding.gif']").each(function(i, img) {
		    	var $link = $(img).parent().parent().find("a[href^='/p/']").first();
		    	var title = $link.text();//get the title of tiezi

	            console.log(title);
		        
		        //get the url of tiezi
		        var temp_url = "http://tieba.baidu.com"+$link.attr("href");

		        //get the content of tiezi
		        download(temp_url,function(data){
		        	var $ = cheerio.load(data);

		        	//remove hyperlinks
		        	$("a").each(function(i, e){
		        		var text = $(e).text();
		        		$(e).replaceWith(text);
		        	});

		        	var $contentDiv = $("div#j_p_postlist > div").first().find("div[id^=post_content]").first();
		        	var content = $('div','<div></div>').append($contentDiv).html();

		        	tackleTiezi(title,content);
		        });
		      });

		    console.log("done");
		  }
		  else console.log("error");  
		});		
	},1000*60*10);
	
};

exports.stop = function(req, res){

};

