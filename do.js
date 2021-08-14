const auth = require('./auth.json');
var fetch = require('node-fetch');


let aDates;

// По умолчанию утилита выдает отчет за последние 7 дней
// Но если нужны конкретные даты — нужно раскомментить этот кусок и подставить нужные даты
// 
// aDates = [
//     new Date('2021-06-28'),
//     new Date('2021-06-29'),
//     new Date('2021-06-30'),
//     new Date('2021-07-01'),
//     new Date('2021-07-02'),
//     new Date('2021-07-03'),
//     new Date('2021-07-04')
// ];

if (!aDates) {
    aDates = getLast7Days();
}

echoReadme();
aDates.forEach(async (dateItem) => {
    getData(dateItem).then(
        result => {
            result.forEach((itemProject) => {
                itemProject.items.forEach(function (itemDesc) {
                    let preparedString = prepareString(itemDesc.title.time_entry, itemProject.title.project);
                    console.log(
                        dateItem.toLocaleDateString() + ';' +
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



// читай про async вот тут https://learn.javascript.ru/async-await
// мне кажется это крутая удобная штука, сразу делать промисы
async function getData(oDate) {

    return fetch(
        'https://api.track.toggl.com/reports/api/v2/summary' +
        '?workspace_id=' + auth.toggl.workspace_id +
        '&client_ids=' + auth.toggl.client_ids +
        '&since=' + formatDateForAPI(oDate) +
        '&until=' + formatDateForAPI(oDate) +
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

    return out;
}


/**
 * Возвращает последние 7 дней, включая сегодня
 */
function getLast7Days() {
    let out = [];
    for (let i = 0; i < 7; i++) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        out.push(d);
    }
    return out;
}

/**
 * Возвращает дату в формате yyyy-mm-dd, необходимую для API
 */
function formatDateForAPI(oDate) {
    return oDate.getFullYear() + '-' +
        (oDate.getMonth() + 1) + '-' +
        oDate.getDate();
}


function echoReadme() {
    console.log ('\r\n\
*********************************************************************************************************************************\r\n\
    ЧТО ДЕЛАТЬ С ЭТИМИ ДАННЫМИ:\r\n\
    \r\n\
    1. Скопировать этот вывод\n\r\
    2. Вставляешь его в таблицу с отчетом\r\n\
    3. Данные => Разделить текст на столбцы\r\n\
    4. Выбираешь точку с запятой\r\n\
        Если в toggl я случайно указал точку с запятой в "активности", тогда столбцы немного поедут. Нужно просто поправить\r\n\
    5. Данные => Сортировать ДИАПАЗОН а не Лист\r\n\
    6. Заполнить столбец Тип работы, если необходимо\r\n\
    7. Обязательно сверить отчет с toggl\r\n\
        Скорее всего, в моем отчете будет на 10-15 меньше, чем в toggle.\r\n\
        Походу из-за округления. Можно их просто накинуть на какую-нибудь задачу\r\n\
*********************************************************************************************************************************\r\n\
        ');
}

/**
 * Возвращает даты за прошлую неделю.
 *
 * Сначала я сделал так, чтобы по-умолчанию отчет собирался за прошлую неделю.
 * Именно за прошлую неделю, а не за 7 дней. Но сейчас я от этого отказался, и собираю отчет за последние 7 дней.
 *
 * Этот код оставлю, вдруг еще пригодится.
 */
// function getPrevWeek() {

//     let firstDate = new Date();
//     firstDate.setDate(new Date().getDate() - (6 + new Date().getDay()));

//     let out = [];
//     for (let i = 0; i < 7; i++) {
//         let newDate = new Date(firstDate.getTime()); // чтобы сделать копию, а не ссылаться на него
//         newDate.setDate(firstDate.getDate() + i);
//         out.push(newDate);
//     }
//     return out;
// }