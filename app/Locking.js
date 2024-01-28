const LOCK_PROPERTY_PREFIX = "lock.";

function lock(lockName) {
  var p = PropertiesService.getUserProperties();
  var key = LOCK_PROPERTY_PREFIX + lockName;
  var value = `${Date.now()}.${Math.random() * 1000000}`;
  if (p.getProperty(key)) {
    return false;
  }
  p.setProperty(key, value);
  return p.getProperty(key) == value;
}

function unlock(lockName) {
  var p = PropertiesService.getUserProperties();
  var key = LOCK_PROPERTY_PREFIX + lockName;
  p.deleteProperty(key);
}