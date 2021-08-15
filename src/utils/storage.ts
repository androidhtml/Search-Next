/*
 * @Author: Vir
 * @Date: 2021-08-06 14:42:56
 * @Last Modified by: Vir
 * @Last Modified time: 2021-08-15 20:48:50
 */

// 生成uuid
const uuid = (len?: number, radix?: number) => {
  var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(
    '',
  );
  var uuid = [],
    i;
  radix = radix || chars.length;

  if (len) {
    // Compact form
    for (i = 0; i < len; i++) uuid[i] = chars[0 | (Math.random() * radix)];
  } else {
    // rfc4122, version 4 form
    var r;

    // rfc4122 requires these characters
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    uuid[14] = '4';

    // Fill in random data.  At i==19 set the high bits of clock sequence as
    // per rfc4122, sec. 4.1.5
    for (i = 0; i < 36; i++) {
      if (!uuid[i]) {
        r = 0 | (Math.random() * 16);
        uuid[i] = chars[i == 19 ? (r & 0x3) | 0x8 : r];
      }
    }
  }

  return uuid.join('');
};

const isObject = (object: any) => {
  return object instanceof Object && object.constructor.name === 'Object';
};

const isArray = (array: any) => {
  return array instanceof Array && array.constructor.name === 'Array';
};

// 检查是否支持 storage
const isSupported = (storage: Storage) => {
  if (!storage || !(storage instanceof Object)) {
    return false;
  }

  try {
    storage.setItem('_supported', '1');
    storage.removeItem('_supported');
    return true;
  } catch (e) {
    return false;
  }
};

class Collection {
  name: any;
  storage: any;
  cache: any[];
  path: string;
  cacheable: boolean;
  primaryKey: any;
  constructor(db: any, name: string, opts: DBOpts) {
    opts = opts || {};

    this.name = name; // 名称
    this.storage = db.storage; // 当前storage
    this.path = db.database + db.sep + name; // 路径
    this.primaryKey = opts.primaryKey || db.primaryKey;
    this.cache = []; // 缓存
    this.cacheable = false; // 是否可缓存
  }

  // 初始化缓存
  _initCache() {
    let cache: any[] = [];
    let filterExp = new RegExp('^' + this.path);

    for (let key of Object.keys(this.storage)) {
      if (filterExp.test(key)) {
        cache = JSON.parse(this.storage.getItem(key));
      }
    }
    this.cache = cache;
    this.cacheable = true;
  }

  inset(data: any, opts?: any) {
    let arrayInsert = isArray(data);
    let objectInset = isObject(data);

    if (arrayInsert) {
      if (data.length === 0) {
        return [];
      }
    } else {
      data = [data];
    }

    let pk = this.primaryKey;
    let cacheable = this.cacheable;
    let pathData = JSON.parse(this.storage.getItem(this.path) || '[]');

    for (let row of data) {
      if (!objectInset && !arrayInsert) {
        throw new Error(
          'TypeError: insert data must be an object or an object array',
        );
      }

      if (typeof row[pk] === 'undefined') {
        row[pk] = uuid();
      }

      if (cacheable) {
        this.cache = pathData.concat(row);
      }

      this.storage.setItem(this.path, JSON.stringify(pathData.concat(row)));
    }

    return arrayInsert ? data : data[0];
  }
}
interface DBOpts {
  storage: Storage | null;
  database: string;
  primaryKey?: string;
  sep?: string;
}

class StorageDB {
  storage: Storage | null;
  database: string;
  primaryKey?: string;
  sep?: string;
  constructor(opts: DBOpts) {
    this.storage = opts.storage || (window && window.localStorage);
    this.database = opts.database || 'db';
    this.primaryKey = opts.primaryKey || '_id';
    this.sep = opts.sep || ':';

    if (!isSupported(this.storage)) {
      this.storage = null;
    }
  }

  get(name: string, opts?: DBOpts) {
    return new Collection(
      this,
      name,
      opts || {
        storage: this.storage,
        database: this.database,
        primaryKey: this.primaryKey,
        sep: this.sep,
      },
    );
  }

  collection(name: string, opts?: DBOpts) {
    return this.get(name, opts);
  }
}

export default StorageDB;
