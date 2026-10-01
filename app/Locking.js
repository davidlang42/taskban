const LOCK_PROPERTY_PREFIX = "lock.";

function lock(lockName) {
  var p = PropertiesService.getUserProperties();
  var key = LOCK_PROPERTY_PREFIX + lockName;
  var value = `${Date.now()}.${Math.round(Math.random() * 1000000)}`;
  if (p.getProperty(key)) {
    return false;
  }
  p.setProperty(key, value);
  return p.getProperty(key) == value;
}

function timestampOfLock(lockName) {
  var p = PropertiesService.getUserProperties();
  var key = LOCK_PROPERTY_PREFIX + lockName;
  var value = p.getProperty(key);
  if (!value) {
    return null;
  }
  var timestamp = value.split('.')[0];
  return parseInt(timestamp);
}

function unlock(lockName) {
  var p = PropertiesService.getUserProperties();
  var key = LOCK_PROPERTY_PREFIX + lockName;
  p.deleteProperty(key);
}