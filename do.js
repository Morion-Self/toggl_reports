const auth = require('./auth.json');
var fetch = require('node-fetch');

let aDates = [
    '2021-06-28',
    '2021-06-29',
    '2021-06-30',
    '2021-07-01',
    '2021-07-02'
];

aDates.forEach(async (dateItem) => {
    let oDate = new Date(dateItem);

    getData(dateItem).then(
        result => {
            result.forEach((itemProject) => {
                itemProject.items.forEach(function (itemDesc) {
                    let preparedString = prepareString(itemDesc.title.time_entry, itemProject.title.project);
                    console.log(
                        oDate.toLocaleDateString() + ';' +
                        preparedString.task + ';' +
                        convertMS(itemDesc.time) + ';' +
                        preparedString.jobType
                    );
                });
            });
        },
        error => console.log(error)
    );
});



/**
 * Конвертит милисекунды в часы и минуты
 */
function convertMS(milliseconds) {
    let hour, minute, seconds;
    seconds = Math.floor(milliseconds / 1000);
    minute = Math.floor(seconds / 60);
    seconds = seconds % 60;
    hour = Math.floor(minute / 60);
    minute = minute % 60;
    hour = hour % 24;
    // добавляем лидирующие нули
    minute = '0' + minute;
    minute = minute.substring(minute.length - 2);
    hour = '0' + hour;
    hour = hour.substring(hour.length - 2);
    return hour + ':' + minute;
}

// читай про async вот тут https://learn.javascript.ru/async-await
// мне кажется это крутая удобная штука, сразу делать промисы
async function getData(sDate) {

    return fetch(
        'https://api.track.toggl.com/reports/api/v2/summary' +
        '?workspace_id=' + auth.toggl.workspace_id +
        '&client_ids=' + auth.toggl.client_ids +
        '&since=' + sDate +
        '&until=' + sDate +
        '&user_agent=my_report_app',
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${new Buffer.from(`${auth.toggl.token}:api_token`, 'utf8').toString('base64')}`
            }
        }
    )
        .then(res => res.json()) // достаем json (см https://learn.javascript.ru/fetch)
        .then(json => json.data) // из json выбираем только объект data
}

/**
 * Готовит данные, которую запишем в отчет.
 * 
 * По возможности делает там, где возможно:
 * - определяет тип работ
 * - указывает правильные падежи
 * - Убирает что-то из задачи и выносит в тип работ
 * - и т.п.
 */
function prepareString(time_entry, project) {

    if (time_entry === 'Пишу план/бриф/заявку') {
        time_entry = 'Пишу план/бриф';
    }

    // значения по-умолчанию
    let out = {
        jobType: '',
        task: (time_entry + ' ' + project)
    };


    // если это созвон или ревью, пишем это в тип работы
    if (
        time_entry === 'Созвон' ||
        time_entry === 'Ревью'
    ) {
        out.jobType = time_entry;
    }

    // для этих проектов убираем название проекта из задачи, и пишем его в тип.работы
    if (
        project === 'Маркетинг, развитие блога' ||
        project === 'Радар' ||
        project === 'Соцсети'
    ) {
        out.jobType = project
        out.task = time_entry;
    }

    // если проект — лендинг, то пишем это в тип работы
    if (project.toLowerCase().indexOf('лендинг') != -1) {
        out.jobType = 'Лендинг';
    }

    if (time_entry.toLowerCase() === 'пишу' && project.toLowerCase().indexOf('статья') === 0) {
        out.jobType = 'Статья';
    }
    
    // if (time_entry === 'Созвон редакции ЗО') {
    //     out.jobType = 'Созвон редакции';
    //     out.task = time_entry;
    // }




    return out;
}