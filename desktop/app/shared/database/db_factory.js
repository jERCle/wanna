const { ipcRenderer: ipc } = require('electron');
const parse = require('./app/shared/database/parse');
const crypto = require('crypto');
const Datastore = require('nedb');

const db = {};
db.tasks = new Datastore({
  filename: `${__dirname}/tasks.db`,
  afterSerialization: (object) => {
    const cipher = crypto.createCipher('aes256', 'sample-key');
    return (cipher.update(object, 'utf8', 'hex') + cipher.final('hex'));
  },
  beforeDeserialization: (object) => {
    const decipher = crypto.createDecipher('aes256', 'sample-key');
    return (decipher.update(object, 'hex', 'utf8') + decipher.final('utf8'));
  },
  autoload: true,
});
db.ideas = new Datastore({
  filename: `${__dirname}/ideas.db`,
  afterSerialization: (object) => {
    const cipher = crypto.createCipher('aes256', 'sample-key2');
    return (cipher.update(object, 'utf8', 'hex') + cipher.final('hex'));
  },
  beforeDeserialization: (object) => {
    const decipher = crypto.createDecipher('aes256', 'sample-key2');
    return (decipher.update(object, 'hex', 'utf8') + decipher.final('utf8'));
  },
  autoload: true,
});
db.settings = new Datastore({
  filename: `${__dirname}/settings.db`,
  afterSerialization: (object) => {
    const cipher = crypto.createCipher('aes256', 'sample-key');
    return (cipher.update(object, 'utf8', 'hex') + cipher.final('hex'));
  },
  beforeDeserialization: (object) => {
    const decipher = crypto.createDecipher('aes256', 'sample-key');
    return (decipher.update(object, 'hex', 'utf8') + decipher.final('utf8'));
  },
  autoload: true,
});


/**
 * Get a query, parse it and add it to
 * database
 * @param  {string}   query task query
 * @param  {Function} cb    callback
 * @return {undefined}
 */
function insert(query, cb) {
  const taskObj = parse(query);
  db.tasks.insert(taskObj, (err) => {
    if (err) {
      ipc.send('insert-error', err);
    } else {
      cb();
    }
  });
}

/**
 * Get an idea and add it to database
 * @param  {string}   idea idea
 * @param  {Function} cb   callback
 * @return {undefined}
 */
function insertIdea(idea, cb) {
  db.ideas.insert({ idea }, (err) => {
    if (err) {
      ipc.send('insert-error', err);
      cb(err);
    } else {
      cb();
    }
  });
}

/**
 * Find appropriate tasks based on type
 * @param  {string}   type Determines type of task
 *                         to be found
 * @param  {Function} cb   callback
 * @return {undefined}
 */
function find(type, cb) {
  const now = Date.now();
  switch (type) {
  case 'open':
    db.tasks.find({
      $and: [{ start: { $lt: now } },
            { end: { $gt: now } },
            { status: 0 },
      ],
    }, { text: 1, start: 1, end: 1, units: 1, period: 1 },
        (err, tasks) => {
          if (err) {
            ipc.send('find-error', err);
            cb(err);
          } else {
            const nowInner = (Date.now() + (86400000 - (Date.now() % 86400000))) +
              (new Date().getTimezoneOffset() * 60000);
            const sorted = Object.keys(tasks).sort((a, b) => {
              const totalA = tasks[a].end - tasks[a].start;
              const totalB = tasks[b].end - tasks[b].start;
              const partialA = nowInner - tasks[a].start;
              const partialB = nowInner - tasks[b].start;
              const ratioA = partialA / totalA;
              const ratioB = partialB / totalB;
              return ratioB - ratioA;
            });
            cb(sorted.map(key => tasks[key]));
          }
        });
    break;
  case 'overdue':
    db.tasks.find({
      $and: [{ end: { $lt: now } },
            { status: 0 },
      ],
    }, { text: 1, start: 1, end: 1, units: 1, period: 1 },
        (err, tasks) => {
          if (err) {
            ipc.send('find-error', err);
            cb(err);
          } else {
            const nowInner = (Date.now() + (86400000 - (Date.now() % 86400000))) +
              (new Date().getTimezoneOffset() * 60000);
            const sorted = Object.keys(tasks).sort((a, b) => {
              const totalA = tasks[a].end - tasks[a].start;
              const totalB = tasks[b].end - tasks[b].start;
              const partialA = nowInner - tasks[a].start;
              const partialB = nowInner - tasks[b].start;
              const ratioA = partialA / totalA;
              const ratioB = partialB / totalB;
              return ratioB - ratioA;
            });
            cb(sorted.map(key => tasks[key]));
          }
        });
    break;
  case 'notyet':
    db.tasks.find({
      $and: [{ start: { $gt: now } },
            { status: 0 },
      ],
    }, { text: 1, start: 1, end: 1, units: 1, period: 1 },
        (err, tasks) => {
          if (err) {
            ipc.send('find-error', err);
            cb(err);
          } else {
            const nowInner = (Date.now() + (86400000 - (Date.now() % 86400000))) +
              (new Date().getTimezoneOffset() * 60000);
            const sorted = Object.keys(tasks).sort((a, b) => {
              const totalA = tasks[a].end - tasks[a].start;
              const totalB = tasks[b].end - tasks[b].start;
              const partialA = nowInner - tasks[a].start;
              const partialB = nowInner - tasks[b].start;
              const ratioA = partialA / totalA;
              const ratioB = partialB / totalB;
              return ratioB - ratioA;
            });
            cb(sorted.map(key => tasks[key]));
          }
        });
    break;
  default:
  }
}
/**
 * Find ideas
 * @param  {Function} cb   callback
 * @return {undefined}
 */
function findIdeas(cb) {
  db.ideas.find({}, { idea: 1 }, (err, ideas) => {
    if (err) {
      ipc.send('find-error', err);
    } else {
      cb(Object.keys(ideas).map(key => ideas[key]));
    }
  });
}

/**
 * Mark a task as done in the database
 * @param  {number}   taskId task id
 * @param  {Function} cb     callback
 * @return {undefined}
 */
function markAsDone(taskId, cb) {
  db.tasks.find(
    { _id: taskId },
    { start: 1, end: 1, period: 1 },
    (err, tasks) => {
      if (err) {
        ipc.send('find-error', err);
        cb(err);
      } else {
        const { start, end, period } = tasks[0];
        if (period === -1) {
          db.tasks.update({
            _id: taskId,
          }, { $set: {
            status: 1,
          } }, {}, (errInner) => {
            if (errInner) {
              ipc.send('update-error', err);
            } else {
              cb();
            }
          });
        } else {
          db.tasks.update({
            _id: taskId,
          }, { $set: {
            start: start + period,
            end: end + period,
          } }, {}, (errInner) => {
            if (errInner) {
              ipc.send('update-error', err);
            } else {
              cb();
            }
          });
        }
      }
    }
  );
}

/**
 * Remove a task from database
 * @param  {number}   taskId task id
 * @param  {Function} cb     callback
 * @return {undefined}
 */
function remove(taskId, cb) {
  db.tasks.remove({
    _id: taskId,
  }, {}, (err) => {
    if (err) {
      ipc.send('remove-error', err);
      cb(err);
    } else {
      cb();
    }
  });
}

/**
 * Remove an idea from database
 * @param  {number}   ideaId idea id
 * @param  {Function} cb     callback
 * @return {undefined}
 */
function removeIdea(ideaId, cb) {
  db.ideas.remove({
    _id: ideaId,
  }, {}, (err) => {
    if (err) {
      ipc.send('remove-error', err);
      cb(err);
    } else {
      cb();
    }
  });
}

/**
 * Edit a task in database
 * @param  {number}   taskId  task id
 * @param  {string}   newText new task text
 * @param  {Function} cb      callback
 * @return {undefined}
 */
function edit(taskId, newText, cb) {
  db.tasks.update({
    _id: taskId,
  }, {
    $set: {
      text: newText,
    },
  }, {}, (err) => {
    if (err) {
      ipc.send('update-error', err);
      cb(err);
    } else {
      cb();
    }
  });
}

/**
 * Edit an idea in database
 * @param  {number}   ideaId  idea id
 * @param  {string}   newText new idea text
 * @param  {Function} cb      callback
 * @return {undefined}
 */
function editIdea(ideaId, newIdea, cb) {
  db.ideas.update({
    _id: ideaId,
  }, {
    $set: {
      idea: newIdea,
    },
  }, {}, (err) => {
    if (err) {
      ipc.send('update-error', err);
      cb(err);
    } else {
      cb();
    }
  });
}

/**
 * Fuction to set default settings
 * for the app.
 * @param  {Function} cb callback
 */
function setDefaultSettings(cb) {
  db.settings.find(
    { name: 'settings' },
    {},
    (err, settings) => {
      if (err) {
        ipc.send('find-error', err);
      } else if (settings.length === 0) {
        db.settings.insert({
          name: 'settings',
          notyet: true,
        }, () => {
          cb();
        });
      } else {
        cb();
      }
    }
  );
}

/**
 * Fetch showing not-yet tasks status
 * from database
 * @param  {Function} cb callback
 * @return {undefined}
 */
function fetchNotYet(cb) {
  db.settings.find(
    { name: 'settings' },
    { notyet: 1, _id: 0 },
    (err, settings) => {
      if (err) {
        ipc.send('find-error', err);
      } else {
        cb(settings[0].notyet);
      }
    }
  );
}

/**
 * Fetch running app in fullscreen status
 * from database
 * @param  {Function} cb callback
 * @return {undefined}
 */
function fetchFullscreen(cb) {
  db.settings.find(
    { name: 'settings' },
    { fullscreen: 1, _id: 0 },
    (err, settings) => {
      if (err) {
        ipc.send('find-error', err);
      } else {
        cb(settings[0].fullscreen);
      }
    }
  );
}

/**
 * Set showing not-yet tasks status
 * into database
 * @param  {Function} cb callback
 * @return {undefined}
 */
function setNotYet(state) {
  db.settings.update(
    { name: 'settings' },
    { $set: { notyet: state } }
  );
}

/**
 * Set running app in fullscreen status
 * into database
 * @param  {Function} cb callback
 * @return {undefined}
 */
function setFullscreen(state) {
  db.settings.update(
    { name: 'settings' },
    { $set: { fullscreen: state } }
  );
}

angular.module('MainApp')
  .factory('db', () => {
    const ret = {
      insert,
      insertIdea,
      find,
      findIdeas,
      markAsDone,
      remove,
      removeIdea,
      edit,
      editIdea,
      setDefaultSettings,
      fetchNotYet,
      fetchFullscreen,
      setNotYet,
      setFullscreen,
    };
    return ret;
  });
