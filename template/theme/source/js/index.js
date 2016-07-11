require('../css/index.css')
window.jQuery = window.$ = require('jquery')
window.hljs = require('./highlight.pack.js')
require('./jquery.unveil.js')

var lunr = require('lunr')
var searchTpl = require('raw!./searchTpl.html')

// pick from underscore
var debounce = function(func, wait, immediate) {
  var timeout, args, context, timestamp, result;

  var later = function() {
    var last = Date.now() - timestamp;

    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;
      if (!immediate) {
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      }
    }
  };

  return function() {
    context = this;
    args = arguments;
    timestamp = Date.now();
    var callNow = immediate && !timeout;
    if (!timeout) timeout = setTimeout(later, wait);
    if (callNow) {
      result = func.apply(context, args);
      context = args = null;
    }

    return result;
  };
}

var timeSince = function(date) {
  var seconds = Math.floor((new Date() - date) / 1000)
  var interval = Math.floor(seconds / 31536000)
  if (interval > 1) return interval + timeSinceLang.year

  interval = Math.floor(seconds / 2592000)
  if (interval > 1) return interval + timeSinceLang.month

  interval = Math.floor(seconds / 86400)
  if (interval > 1) return interval + timeSinceLang.day

  interval = Math.floor(seconds / 3600)
  if (interval > 1) return interval + timeSinceLang.hour

  interval = Math.floor(seconds / 60)
  if (interval > 1) return interval + timeSinceLang.minute

  return Math.floor(seconds) + timeSinceLang.second
}

var initSearch = function() {
  $.getJSON('/index.json').then(function(articles) {
    var db = lunr(function() {
      this.field('title', { boost: 10 })
      this.field('content')
    })
    var tpl = function(title, preview, link) {
      return searchTpl
      .replace('{{title}}', title)
      .replace('{{link}}', link)
      .replace('{{preview}}', preview)
    }
    articles.forEach(function(article, idx) {
      db.add({
        id: idx,
        title: article.title,
        content: article.content
      })
    })
    var oriHtml = $('.article-list').html()
    $('#search').on('input', debounce(function() {
      var keyword = $(this).val().trim()
      var results = db.search(keyword)
      if (results.length) {
        var retHtml = ''
        results.forEach(function(result) {
          var item = articles[result.ref]
          var itemHtml = tpl(item.title, item.preview, item.link)
          retHtml += itemHtml
        })
        $('.page-nav').hide()
        $('.article-list').html(retHtml)
      } else {
        if (keyword) {
          $('.page-nav').hide()
          $('.article-list').html('<div class="empty">未搜索到 "<span>' + keyword + '</span>"</div>')
        } else {
          $('.page-nav').show()
          $('.article-list').html(oriHtml)
        }
      }
    }, 500))
  })
}

$(function() {
  // render date
  $('.date').each(function(idx, item) {
    var $date = $(item)
    var timeStr = $date.data('time')
    if (timeStr) {
      var unixTime = Number(timeStr) * 1000
      var date = new Date(unixTime)
      $date.prop('title', date).text(timeSince(date))
    }
  })
  // render highlight
  $('pre code').each(function(i, block) {
    hljs.highlightBlock(block)
  })
  // append image description
  $('img').each(function(idx, item) {
    $item = $(item)
    if ($item.attr('data-src')) {
      $item.wrap('<a href="' + $item.attr('data-src') + '" target="_blank"></a>')
      var imageAlt = $item.prop('alt')
      if ($.trim(imageAlt)) $item.parent('a').after('<div class="image-alt">' + imageAlt + '</div>')
    }
  })
  // lazy load images
  if ($('img').unveil) {
    $('img').unveil(200, function() {
      $(this).load(function() {
        this.style.opacity = 1
      })
    })
  }
  // init search
  initSearch()
})