// Module contains all the code for handling labels as "[LABEL_NAME]" within the title of a task

function removeLabels(title) {
  return title.replace(/\s*\[.*?\]\s*/g, "");
}