function onHomepage(e) {
  const card = CardService.newCardBuilder();
  card.addSection(buildBoardList());
  if (e.hostApp == "calendar") {
    card.addSection(buildClearAll());
    card.addSection(buildRemoveCompletedDates());
  }
  return card.build();
}

function buildBoardList() {
  const boards = listBoards();
  const section = CardService.newCardSection();
  for (const board of boards) {
    const url = INTERNAL_URL+"?b="+board.title.replace(/ /g,"-");
    const link = CardService.newOpenLink()
      .setUrl(url)
      .setOpenAs(CardService.OpenAs.OVERLAY);
    const button = CardService.newTextButton()
      .setText(board.title)
      .setOpenLink(link);
    const buttonSet = CardService.newButtonSet()
      .addButton(button);
    section.addWidget(buttonSet);
  }
  return section;
}

function buildClearAll() {
  const section = CardService.newCardSection();
  const action = CardService.newAction()
    .setFunctionName('runClearAll');
  const button = CardService.newTextButton()
    .setText("Clear ALL completed tasks")
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setBackgroundColor("#28A745")
    .setOnClickAction(action);
  const buttonSet = CardService.newButtonSet()
    .addButton(button);
  section.addWidget(buttonSet);
  return section;
}

function runClearAll() {
  clearCompletedTasksOnAllBoards();
  var notification = CardService.newNotification()
    .setText("Completed tasks cleared from all boards.");
  var actionResponse = CardService.newActionResponseBuilder()
    .setNotification(notification);
  return actionResponse.build();
}

function buildRemoveCompletedDates() {
  const section = CardService.newCardSection();
  const action = CardService.newAction()
    .setFunctionName('runRemoveCompletedDates');
  const button = CardService.newTextButton()
    .setText("Remove ALL completed dates")
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setBackgroundColor("#FFC107")

    .setOnClickAction(action);
  const buttonSet = CardService.newButtonSet()
    .addButton(button);
  section.addWidget(buttonSet);
  return section;
}

function runRemoveCompletedDates() {
  removeCompletedTasksDueDatesOnAllBoards();
  var notification = CardService.newNotification()
    .setText("Removed completed due dates from all boards.");
  var actionResponse = CardService.newActionResponseBuilder()
    .setNotification(notification);
  return actionResponse.build();
}