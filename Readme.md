# Fibo

项目名字来源于斐波那契数列的简写。这个项目是从x-ray原项目fork了一份，由于原项目多年没有维护，所以从最后一版的2.3.4版本开始重构，对项目依赖的远古第三方包也进行了重构，并且把代码复制放在了项目里面

项目已经通过了ESLint的检查，代码完全符合ESM模块的规范要求


## 安装

由于项目还在重构中，暂时没有上传到NPM官方仓库的打算，所以需要从Github直接安装

```
npm install https://github.com/gnuos/fibo.git
```


## Features

- **Flexible schema:** Supports strings, arrays, arrays of objects, and nested object structures. The schema is not tied to the structure of the page you're scraping, allowing you to pull the data in the structure of your choosing.

- **Composable:** The API is entirely composable, giving you great flexibility in how you scrape each page.

- **Pagination support:** Paginate through websites, scraping each page. X-ray also supports a request `delay` and a pagination `limit`. Scraped pages can be streamed to a file, so if there's an error on one page, you won't lose what you've already scraped.

- **Crawler support:** Start on one page and move to the next easily. The flow is predictable, following
  a breadth-first crawl through each of the pages.

- **Responsible:** X-ray has support for concurrency, throttles, delays, timeouts and limits to help you scrape any page responsibly.

- **Pluggable drivers:** Swap in different scrapers depending on your needs. Currently supports HTTP and [PhantomJS driver](http://github.com/lapwinglabs/x-ray-phantom) drivers. In the future, I'd like to see a Tor driver for requesting pages through the Tor network.


## Selector API

### xray(url, selector)(fn)

Scrape the `url` for the following `selector`, returning an object in the callback `fn`.
The `selector` takes an enhanced jQuery-like string that is also able to select on attributes. The syntax for selecting on attributes is `selector@attribute`. If you do not supply an attribute, the default is selecting the `innerText`.

Here are a few examples:

- Scrape a single tag

```js
xray('http://google.com', 'title')(function(err, title) {
  console.log(title) // Google
})
```

- Scrape a single class

```js
xray('http://reddit.com', '.content')(fn)
```

- Scrape an attribute

```js
xray('http://techcrunch.com', 'img.logo@src')(fn)
```

- Scrape `innerHTML`

```js
xray('http://news.ycombinator.com', 'body@html')(fn)
```

### xray(url, scope, selector)

You can also supply a `scope` to each `selector`. In jQuery, this would look something like this: `$(scope).find(selector)`.

### xray(html, scope, selector)

Instead of a url, you can also supply raw HTML and all the same semantics apply.

```js
const html = '<body><h2>Pear</h2></body>'
x(html, 'body', 'h2')(function(err, header) {
  header // => Pear
})
```

## API

### xray.driver(driver)

Specify a `driver` to make requests through. Available drivers include:

- [request](https://github.com/Crazometer/request-x-ray) - A simple driver built around request. Use this to set headers, cookies or http methods.
- [phantom](https://github.com/lapwinglabs/x-ray-phantom) - A high-level browser automation library. Use this to render pages or when elements need to be interacted with, or when elements are created dynamically using javascript (e.g.: Ajax-calls).


> **request库已经停止维护了，其中的代码还是可以借鉴参考的，可以用于快速封装自己需要的HTTP客户端库，现在流行的其他库有needle、ky、got**


### xray.stream()

Returns Readable Stream of the data. This makes it easy to build APIs around x-ray. Here's an example with Express:

```js
const app = require('express')()
const x = require('fibo')()

app.get('/', function(req, res) {
  var stream = x('http://google.com', 'title').stream()
  stream.pipe(res)
})
```

### xray.write([path])

Stream the results to a `path`.

If no path is provided, then the behavior is the same as [.stream()](#xraystream).

### xray.then(cb)

Constructs a `Promise` object and invoke its `then` function with a callback `cb`. Be sure to invoke `then()` at the last step of xray method chaining, since the other methods are not promisified.

```js
x('https://dribbble.com', 'li.group', [
  {
    title: '.dribbble-img strong',
    image: '.dribbble-img [data-src]@data-src'
  }
])
  .paginate('.next_page@href')
  .limit(3)
  .then(function(res) {
    console.log(res[0]) // prints first result
  })
  .catch(function(err) {
    console.log(err) // handle error in promise
  })
```

### xray.paginate(selector)

Select a `url` from a `selector` and visit that page.

### xray.limit(n)

Limit the amount of pagination to `n` requests.

### xray.abort(validator)

Abort pagination if `validator` function returns `true`.
The `validator` function receives two arguments:

- `result`: The scrape result object for the current page.
- `nextUrl`: The URL of the next page to scrape.

### xray.delay(from, [to])

Delay the next request between `from` and `to` milliseconds.
If only `from` is specified, delay exactly `from` milliseconds.
```js
const x = Xray().delay('1s', '10s')
```

### xray.concurrency(n)

Set the request concurrency to `n`. Defaults to `Infinity`.
```js
const x = Xray().concurrency(2)
```

### xray.throttle(n, ms)

Throttle the requests to `n` requests per `ms` milliseconds.
```js
const x = Xray().throttle(2, '1s')
```

### xray.timeout (ms)

Specify a timeout of `ms` milliseconds for each request.
```js
const x = Xray().timeout(30)
```

## Collections

X-ray also has support for selecting collections of tags. While `x('ul', 'li')` will only select the first list item in an unordered list, `x('ul', ['li'])` will select all of them.

Additionally, X-ray supports "collections of collections" allowing you to smartly select all list items in all lists with a command like this: `x(['ul'], ['li'])`.

## Composition

X-ray becomes more powerful when you start composing instances together. Here are a few possibilities:

### Crawling to another site

```js
const Xray = require('fibo')
const x = Xray()

x('http://google.com', {
  main: 'title',
  image: x('#gbar a@href', 'title') // follow link to google images
})(function(err, obj) {
  /*
  {
    main: 'Google',
    image: 'Google Images'
  }
*/
})
```

### Scoping a selection

```js
const Xray = require('fibo')
const x = Xray()

x('http://mat.io', {
  title: 'title',
  items: x('.item', [
    {
      title: '.item-content h2',
      description: '.item-content section'
    }
  ])
})(function(err, obj) {
  /*
  {
    title: 'mat.io',
    items: [
      {
        title: 'The 100 Best Children\'s Books of All Time',
        description: 'Relive your childhood with TIME\'s list...'
      }
    ]
  }
*/
})
```

### Filters

Filters can specified when creating a new Xray instance. To apply filters to a value, append them to the selector using `|`.

```js
const Xray = require('fibo')
const x = Xray({
  filters: {
    trim: function(value) {
      return typeof value === 'string' ? value.trim() : value
    },
    reverse: function(value) {
      return typeof value === 'string'
        ? value
            .split('')
            .reverse()
            .join('')
        : value
    },
    slice: function(value, start, end) {
      return typeof value === 'string' ? value.slice(start, end) : value
    }
  }
})

x('http://mat.io', {
  title: 'title | trim | reverse | slice:2,3'
})(function(err, obj) {
  /*
  {
    title: 'oi'
  }
*/
})
```

## Examples

- [selector](/examples/selector/index.js): simple string selector
- [collections](/examples/collections/index.js): selects an object
- [arrays](/examples/arrays/index.js): selects an array
- [collections of collections](/examples/collection-of-collections/index.js): selects an array of objects
- [array of arrays](/examples/array-of-arrays/index.js): selects an array of arrays


## License

MIT
