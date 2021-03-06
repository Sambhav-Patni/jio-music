HOME_URL="http://jiofi.local.html/msd.html";
LOGIN_URL="http://jiofi.local.html/sd_login.html";
CRED_NAME  = "credentials";
PLAYER_HTML="Html/player.html";
//Called when application is started.
function OnStart()
{
    lay = app.CreateLayout( "Linear", "FillXY" );

    title = app.CreateText("Jio Music App", 1, 0.1);
    title.SetTextSize(30);
    lay.AddChild(title);
    
    username = app.CreateTextEdit('',0.8);
    username.SetHint('Username');
    password = app.CreateTextEdit('',0.8);
    password.SetHint('Password');
    login = app.CreateButton('Login', 0.4, 0.1);
    login.SetOnTouch(btn_loginTouch);
    
    web = app.CreateWebView(1,0);
    web.SetOnProgress( web_firePlayerLoading );
  
    if(!app.LoadText( CRED_NAME, null )) {
        subTitle = app.CreateText("The credentials that you add here will be saved locally and used further to login", 0.8, 0.1, "Multiline");
        showLoginScreen();
    } else {
        subTitle = app.CreateText("There seems to be a problem loading the page, you can try to relogin here", 0.8, 0.1, "Multiline");
        proceedLogin();
    }
    app.AddLayout( lay );
}

function showLoginScreen() {
    lay.AddChild(subTitle);
    lay.AddChild(username);
    lay.AddChild(password);
    lay.AddChild(login);
}

function proceedLogin() {
    app.ShowProgress( "Loading..." );
    lay.AddChild( web );
    web.LoadUrl( LOGIN_URL );
}

//callbacks start
function btn_loginTouch() {
    if(username.GetText().trim() == '' || password.GetText().trim() == '') {
        subTitle.SetText('Credentials are empty');
        return;
    }
    app.SaveText( CRED_NAME, '{"user": "'+username.GetText()+'", "pass": "'+password.GetText()+'"}' );
    lay.RemoveChild(subTitle);
    lay.RemoveChild(username);
    lay.RemoveChild(password);
    lay.RemoveChild(login);
    proceedLogin();
}

function web_firePlayerLoading(progress)
{
    if(pageLoaded(progress)) {
        web.Execute("if( typeof $ != 'undefined') { $('#csrf_token').val(); } else { null; }", function(token_guess) {
            if (token_guess == null) { playerNotLoaded(); return; }
            var url = web.GetUrl();
            if ( homeLoaded( url ) ) {
                web.TOKEN = token_guess;
                web.SetOnProgress( web_playerLoaded );
                web.LoadUrl( PLAYER_HTML );
            }
        });
    }
}

function web_playerLoaded(progress) {
    if(pageLoaded(progress)) {
        web._loadingHtml = false;
        if( web.GetUrl() == HOME_URL ) {
            web.Execute( '$("#csrf_token").val();', function(res) { web.TOKEN = res } );
            web.LoadUrl( PLAYER_HTML );
            return;
        }
        var script = '$("#csrf_token").val("' + web.TOKEN + '");'+
                'changePage(0, function(res) {'+
                  'if(res != -1) {'+
                    'keepSession();'+
                    'changeSong($("#list li:first"));'+
                  '} else {'+
                    'top.location.href = "'+HOME_URL+'";'+
                  '}'+
                '});';
        web.Execute(script, function() {
            web.SetSize( 1, 0.9 );
            app.HideProgress();
        });
    }
}
//callbacks end

function pageLoaded(progress) {
    if (progress != 10 && progress != 100) {
        web._loadingHtml = true;
    }
    return web._loadingHtml && (progress == 100) && !(web._loadingHtml = false);
}

function homeLoaded(url) {
    if( url == LOGIN_URL ) {
        var credentials = JSON.parse(app.LoadText(CRED_NAME));
        web.Execute( '$(document).ready(function() {'+
            '$("#LOGIN_USER").val("'+credentials.user+'");'+
            '$("#LOGIN_PWD").val("'+credentials.pass+'");'+
            '$("#BTN_Login").click();'+
          '})');
        checkForPlayerLoadedIn(10);
    }
    return url == HOME_URL;
}

function checkForPlayerLoadedIn(timeSeconds) {
    setTimeout(function() {
        if (web.GetUrl().indexOf(PLAYER_HTML) < 0) {
            playerNotLoaded();
        }
    }, timeSeconds * 1000);
}

function playerNotLoaded() {
    showLoginScreen();
    app.HideProgress();
}
