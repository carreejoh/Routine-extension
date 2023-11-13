var messageTitle = "";
var messageDescription = "";

const daysOfWeek = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function notifInterval() {
  chrome.storage.local.get("userLink", function (result) {
    if (result.userLink) {
      let link = result.userLink;
      notificationMaster(link);
    }
  });

  const interval = setInterval(() => {
    let currentTime = new Date();
    let minutes = currentTime.getMinutes();
    let hours = currentTime.getHours();
    let time = parseInt(`${hours}${minutes < 10 ? "0" : ""}${minutes}`, 10);
    chrome.storage.local.get("userLink", function (result) {
      if (result.userLink) {
        let link = result.userLink;
        notificationMaster(link);
      }
    });
  }, 5000);
}

async function notificationMaster(link) {
  const user = await fetchUser(link);
  if (user.message === "Invalid Link") {
    chrome.storage.local.set({ userLink: "Invalid Link" });
    chrome.runtime.sendMessage({ activeLink: "Invalid Link" });
    return;
  }
  let currentDate = new Date();
  let currentDay = currentDate.getDay();
  let currentDayString = daysOfWeek[currentDay];
  let currentDayRoutines = user[currentDayString];
  let routineData = await Promise.all(
    currentDayRoutines.map((id) => fetchIndividualRoutine(id))
  );
  checkRoutineTimes(routineData);
}

function checkRoutineTimes(routineData) {
  let currentTime = new Date();
  let seconds = currentTime.getSeconds();
  let minutes = currentTime.getMinutes();
  let hours = currentTime.getHours();
  let time = parseInt(`${hours}${minutes < 10 ? "0" : ""}${minutes}`, 10);

  for (let i = 0; i < routineData.length; i++) {
    if (routineData[i].startTime <= time && routineData[i].endTime > time) {
      chrome.storage.local.set({ currentRoutine: routineData[i] });
      chrome.runtime.sendMessage({ activeLink: "ActiveRoutine" });

      if (routineData[i].startTime === time && seconds <= 5) {
        messageTitle = `${routineData[i].title} starts now`;
        messageDescription = `${routineData[i].description} `;
        createAlarm()
      }
      break;
    } else {
      chrome.runtime.sendMessage({ activeLink: "NoActiveRoutine" });
      chrome.storage.local.set({ currentRoutine: "noActiveRoutine" });
    }
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.notifLink) {
    addLinkToStorage(request.notifLink);
    notificationMaster(request.notifLink);
  }
  sendResponse(() => {
    return false;
  });
});

chrome.alarms.onAlarm.addListener(() => {
  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: "RoLogo.png",
      title: messageTitle,
      message: messageDescription,
      silent: false,
    },
    () => {}
  );
});

// chrome.notifications.onClicked.addListener(function (RoutineAlarm) {
//   if (RoutineAlarm === "RoutineScheduler") {
//     chrome.tabs.create({ url: "https://routine-scheduler.vercel.app/" });
//   }
// });

function createAlarm() {
  chrome.alarms.create(`RoutineAlarm`, {
    delayInMinutes: 0.01,
  });
}

function addLinkToStorage(link) {
  chrome.storage.local.set({ userLink: link }, function () {
    console.log("userlink in storage");
  });
}

notifInterval();

// API SECTION (CALLS FROM HEROKU SERVER)
//
// FETCH USER FROM INPUT LINK
// FETCH ROUTINES FROM USER DATA

async function fetchUser(link) {
  const response = await fetch(
    `https://routine-server-87a5f72bed6e.herokuapp.com/api/users/link/${link}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );
  const data = await response.json();
  //   chrome.storage.local.set({ userData: data }, function () {
  //     console.log("userData in storage");
  //   });
  return data;
}

async function fetchIndividualRoutine(routineId) {
  try {
    const response = await fetch(
      `https://routine-server-87a5f72bed6e.herokuapp.com/api/routines/individ/${routineId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(err);
  }
}
