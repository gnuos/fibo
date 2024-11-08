import Xray from './index.mjs'

const x = Xray()

x('https://segmentfault.com/', '#hotArticles > .list-group-flush', {
  titles: ['.list-group-item-action .media .media-body .text-body'],
  links: ['.list-group-item-action@href']
}).paginate('.pagination-sm .page-item a@href')
  .limit(2)((err, res) => {
    if (err) throw err

    console.log(JSON.stringify(res, null, 4))
  })
