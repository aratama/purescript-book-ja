import rimraf from 'rimraf'
import util from 'util'

const rimrafp = util.promisify(rimraf)

rimrafp('./dist')
