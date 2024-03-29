$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $mainNav = $(".main-nav-links");
  const $submitLink = $("#nav-submit");
  const $allFavoritesList = $('#favorited-articles');
  const $myStories = $("#my-articles");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
      let currentFavorites = {};
      for (let key of currentUser.favorites) {
        if (currentFavorites[key] === undefined) {
          currentFavorites[key.storyId] = 1;
        }
      }
      $allStoriesList.children().each(function (index, storyItem) {
        let storyItemID = $(storyItem).attr('id');
        if (currentFavorites.hasOwnProperty(storyItemID)) {
          $(storyItem).children().removeClass('far').addClass('fas');
        }
      });
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      <i class="far fa-star"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $allFavoritesList
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $mainNav.show();
  }

  /* simple function to show story submission form */

  $submitLink.click(function () {
    $submitForm.slideToggle();
  });

  /* Event listener for Story Submission Form */
  $submitForm.on("submit", async function (event) {
    event.preventDefault();

    let author = $("#author").val();
    let title = $("#title").val();
    let url = $("#url").val();
    console.log(currentUser);

    let newStory = await storyList.addStory(currentUser, { author, title, url });
    await generateStories();
    generateStoryHTML(newStory);
    $submitForm.slideToggle();
  });



  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }


  /* Function that handles favorites */
  $(".articles-container").on("click", "i", function (e) {
    if (currentUser) {
      var storyID = $(e.target).parent().attr("id");
      if ($(e.target).hasClass("far")) {
        // add to favorites

        currentUser.addFavorite(currentUser.loginToken, storyID);
      } else {
        // remove from favorites
        currentUser.removeFavorite(currentUser.loginToken, storyID);
      }
      $(e.target).toggleClass("far fas")
    }
  });

  /* Function that shows favorites on clicking favorites link */
  $('#nav-favorites').click(function () {
    hideElements();
    for (const favorite of currentUser.favorites) {
      hostName = getHostName(favorite.url);
      $allFavoritesList.append(`<li id="${favorite.storyId}">
        <i class="fas fa-star"></i>
        <a class="article-link" href="${favorite.url}" target="a_blank">
          <strong>${favorite.title}</strong>
        </a>
        <small class="article-author">by ${favorite.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${favorite.username}</small>
      </li>
    `);
    }
    $allFavoritesList.slideToggle();
  });


  $('#nav-my-stories').on("click", function() {
    hideElements();
    console.log(currentUser);
    for (const story of currentUser.ownStories) {
      hostName = getHostName(story.url);
      $myStories.append(`<li id="${story.storyId}">
        <i class="far fa-star"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);
    }
    if (currentUser) {
      showNavForLoggedInUser();
      let currentUserStories = {};
      for (let key of currentUser.favorites) {
        if (currentUserStories[key] === undefined) {
          currentUserStories[key.storyId] = 1;
        }
      }
      $myStories.children().each(function (index, storyItem) {
        console.log(storyItem);
        let storyItemID = $(storyItem).attr('id');
        if (currentUserStories.hasOwnProperty(storyItemID)) {
          $(storyItem).find(">:first-child").removeClass('far').addClass('fas');
        }
      });
    }
    $myStories.slideToggle();
  });


});
