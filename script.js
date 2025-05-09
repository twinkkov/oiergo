// Переменные
let coins = 0, coinsPerClick = 1, multiplier = 1.0, level = 1, levelProgress = 0, levelUpThreshold = 100;
let achievements = [], rebirths = 0, rebirthCost = 100000000, currentDesign = 0, unlockedDesigns = 1;
let autoclickerActive = false, autoclickerSpeed = 1, autoclickerInterval = null;
let cooldowns = { superClick: false, doubleClick: false, multiClick: false, goldRush: false };
let superClickActive = false, doubleClickActive = false, multiClickActive = false, goldRushActive = false;
let upgradePrices = { baseUpgrade: 10, autoclickerCost: 50, autoclickerUpgradePrice: 100, superClick: 500, doubleClick: 800, multiClick: 1000, goldRush: 1500 };
let maxLevel = 0; // Добавлена переменная для хранения максимального уровня
const designClasses = ['light-theme', 'dark-theme', 'design-3', 'design-4', 'design-5'];
const elements = {
    coinCount: document.getElementById('coin-count'),
    level: document.getElementById('level'),
    progressBar: document.getElementById('level-progress-bar'),
    multiplierDisplay: document.getElementById('multiplier-display'),
    autoclickerStatus: document.getElementById('autoclicker-status'),
    autoclickerSpeed: document.getElementById('autoclicker-speed'),
    rebirths: document.getElementById('rebirths'),
    achievementList: document.getElementById('achievement-list'),
    upgradePrice: document.getElementById('upgrade-price'),
    autoclickerUpgradePrice: document.getElementById('autoclicker-upgrade-price'),
    rebirthCost: document.getElementById('rebirth-cost')
};

// Функции для лидерборда
let playerName = localStorage.getItem('playerName') || '';

// Добавляем объект для хранения таймеров
const COOLDOWN_TIMES = {
    superClick: 300000,   // 5 минут
    doubleClick: 600000,  // 10 минут
    multiClick: 900000,   // 15 минут
    goldRush: 1800000     // 30 минут
};

const BOOST_DURATIONS = {
    superClick: 10000,    // 10 секунд
    doubleClick: 15000,   // 15 секунд
    multiClick: 12000,    // 12 секунд
    goldRush: 20000       // 20 секунд
};

let cooldownTimers = {
    superClick: null,
    doubleClick: null,
    multiClick: null,
    goldRush: null
};

// Инициализация lastPurchaseTime для хранения времени по типам
let lastPurchaseTime = JSON.parse(localStorage.getItem('lastPurchaseTime')) || {};

// Убедимся, что lastPurchaseTime всегда объект
if (typeof lastPurchaseTime !== 'object' || lastPurchaseTime === null) {
    lastPurchaseTime = {};
}

// Добавляем отображение оставшегося времени до следующей покупки
function getRemainingCooldown(type) {
    const now = Date.now();
    if (lastPurchaseTime[type]) {
        const remainingTime = COOLDOWN_TIMES[type] - (now - lastPurchaseTime[type]);
        return remainingTime > 0 ? remainingTime : 0;
    }
    return 0;
}

function canPurchase(type) {
    const remainingTime = getRemainingCooldown(type);
    if (remainingTime > 0) {
        alert(`Подождите ${Math.ceil(remainingTime / 1000)} секунд перед следующей покупкой ${type}!`);
        return false;
    }
    lastPurchaseTime[type] = Date.now();
    localStorage.setItem('lastPurchaseTime', JSON.stringify(lastPurchaseTime));
    return true;
}

function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Запрос имени игрока при первом входе
function askPlayerName() {
    if (!playerName) {
        const name = prompt('Введите ваше имя для таблицы лидеров:');
        if (name && name.trim()) {
            playerName = name.trim();
            localStorage.setItem('playerName', playerName);
        }
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.getElementById('leaderboard-container').style.display = 'none';
}

// Функция для загрузки данных лидерборда с сервера
async function fetchLeaderboard() {
    try {
        const response = await fetch('/leaderboard');
        const leaderboard = await response.json();

        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = '';

        leaderboard.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry[0]}</td>
                <td>${entry[1]}</td>
            `;
            leaderboardList.appendChild(row);
        });
    } catch (error) {
        console.error('Ошибка загрузки лидерборда:', error);
    }
}

// Функция для отправки данных игрока на сервер
async function updateLeaderboard(name, coins) {
    try {
        const response = await fetch('/leaderboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, coins }),
        });

        const result = await response.json();
        console.log(result.message);
    } catch (error) {
        console.error('Ошибка обновления лидерборда:', error);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadGame();
    updateUI();

    // Показать кнопки выбора дизайна только после перерождения
    if (rebirths > 0) {
        document.getElementById('design-options').style.display = 'block';
    }

    document.getElementById('click-btn').addEventListener('click', () => {
        let clickValue = coinsPerClick * getActiveMultiplier();
        coins += clickValue;
        updateLevelProgress(clickValue);
        checkAchievements();
        saveGame();
    });

    document.getElementById('shop-btn').addEventListener('click', () => {
        closeAllModals();
        document.getElementById('upgrades-modal').style.display = 'flex';
    });

    document.getElementById('design-btn').addEventListener('click', () => {
        closeAllModals();
        document.getElementById('design-modal').style.display = 'flex';
        updateAvailableDesigns(); // Обновляем доступные стили при открытии меню
    });

    document.getElementById('dev-menu-btn').addEventListener('click', () => {
        closeAllModals();
        document.getElementById('developer-menu').style.display = 'flex';
    });

    // Открытие меню перерождения
    document.getElementById('rebirth-btn').addEventListener('click', () => {
        closeAllModals();
        const rebirthMenu = document.getElementById('rebirth-menu');
        rebirthMenu.style.display = 'flex';
        document.getElementById('rebirth-cost-display').textContent = rebirthCost.toLocaleString();
        document.getElementById('rebirth-count-display').textContent = rebirths;
    });

    // Закрытие меню перерождения
    document.getElementById('close-rebirth-menu').addEventListener('click', () => {
        document.getElementById('rebirth-menu').style.display = 'none';
    });

    // Покупка перерождения
    document.getElementById('buy-rebirth-btn').addEventListener('click', () => {
        if (Math.floor(coins) >= rebirthCost) {
            rebirth();
            alert('Перерождение успешно!');
            document.getElementById('rebirth-menu').style.display = 'none';
        } else {
            alert('Недостаточно монет для перерождения!');
        }
    });

    document.querySelectorAll('.close-modal-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Закрытие модального окна
            const modal = button.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Функция для закрытия модальных окон при клике вне их
    function setupModalClosing(modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeAllModals();
            }
        });
    }

    // Настройка закрытия для всех модальных окон
    document.querySelectorAll('.modal').forEach(setupModalClosing);

    document.getElementById('buy-upgrade').addEventListener('click', buyBaseUpgrade);
    document.getElementById('buy-autoclicker').addEventListener('click', toggleAutoclicker);
    document.getElementById('buy-autoclicker-upgrade').addEventListener('click', upgradeAutoclicker);
    document.getElementById('buy-super-click').addEventListener('click', () => buyUpgrade('superClick'));
    document.getElementById('buy-double-click').addEventListener('click', () => buyUpgrade('doubleClick'));
    document.getElementById('buy-multi-click').addEventListener('click', () => buyUpgrade('multiClick'));
    document.getElementById('buy-gold-rush').addEventListener('click', () => buyUpgrade('goldRush'));

    document.getElementById('set-coins-btn').addEventListener('click', () => {
        const newCoins = parseInt(document.getElementById('coins-input').value);
        if (!isNaN(newCoins)) {
            coins = newCoins;
            updateUI();
            saveGame();
            if (typeof window.updateLeaderboard === 'function') {
                window.updateLeaderboard(playerName, Math.floor(coins));
            }
        }
    });

    document.getElementById('reset-progress-btn').addEventListener('click', () => {
        resetProgress();
        updateUI();
    });

    // Кнопка лидерборда
    document.getElementById('leaderboard-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllModals();
        const container = document.getElementById('leaderboard-container');
        container.style.display = 'block';
        fetchLeaderboard();
    });

    // Закрытие лидерборда при клике вне его
    document.addEventListener('click', (e) => {
        const container = document.getElementById('leaderboard-container');
        const btn = document.getElementById('leaderboard-btn');
        if (!container.contains(e.target) && e.target !== btn && container.style.display === 'block') {
            container.style.display = 'none';
        }
    });

    askPlayerName();
    fetchLeaderboard();
    updateUpgradeButtons();
});

// Функции
function updateUI() {
    if (elements.coinCount) elements.coinCount.textContent = Math.floor(coins);
    if (elements.level) elements.level.textContent = level;
    if (elements.progressBar) elements.progressBar.style.width = `${(levelProgress / levelUpThreshold) * 100}%`;
    if (elements.multiplierDisplay) elements.multiplierDisplay.textContent = multiplier.toFixed(2);
    if (elements.autoclickerSpeed) elements.autoclickerSpeed.textContent = autoclickerSpeed.toFixed(1);
    if (elements.autoclickerStatus) elements.autoclickerStatus.textContent = autoclickerActive ? 'Да' : 'Нет';
    if (elements.rebirths) elements.rebirths.textContent = `Перерождений: ${rebirths}`;
    if (elements.rebirthCost) elements.rebirthCost.textContent = rebirthCost.toLocaleString();
    if (typeof window.updateLeaderboard === 'function') {
        window.updateLeaderboard(playerName, Math.floor(coins));
    }
    updateUpgradeButtons();
}

function updateLevelProgress(amountGained) {
    levelProgress += amountGained;
    if (levelProgress >= levelUpThreshold) {
        level++;
        levelProgress = levelProgress - levelUpThreshold;
        levelUpThreshold = Math.floor(levelUpThreshold * 1.5);
    }
    updateUI();
}

function buyBaseUpgrade() {
    const price = upgradePrices.baseUpgrade;
    if (Math.floor(coins) >= price) {
        coins -= price;
        multiplier *= 1.3;
        upgradePrices.baseUpgrade = Math.floor(price * 1.5);
        updateUI();
        saveGame();
    }
}

function toggleAutoclicker() {
    if (Math.floor(coins) >= upgradePrices.autoclickerCost && !autoclickerActive) {
        coins -= upgradePrices.autoclickerCost;
        autoclickerActive = true;
        startAutoclicker();
        updateUI();
        saveGame();
        if (typeof window.updateLeaderboard === 'function') {
            window.updateLeaderboard(playerName, Math.floor(coins));
        }
        document.getElementById('buy-autoclicker').style.display = 'none';
    }
}

function startAutoclicker() {
    if (autoclickerInterval) clearInterval(autoclickerInterval);
    autoclickerInterval = setInterval(() => {
        if (autoclickerActive) {
            const autoClickValue = coinsPerClick * getActiveMultiplier();
            coins += autoClickValue;
            updateLevelProgress(autoClickValue);
            checkAchievements();
        }
    }, 1000 / autoclickerSpeed);
}

function upgradeAutoclicker() {
    if (Math.floor(coins) >= upgradePrices.autoclickerUpgradePrice && autoclickerActive) {
        coins -= upgradePrices.autoclickerUpgradePrice;
        autoclickerSpeed += 0.5;
        upgradePrices.autoclickerUpgradePrice = Math.floor(upgradePrices.autoclickerUpgradePrice * 1.5);
        restartAutoclicker();
        updateUI();
        saveGame();
        if (typeof window.updateLeaderboard === 'function') {
            window.updateLeaderboard(playerName, Math.floor(coins));
        }
    }
}

function restartAutoclicker() {
    if (autoclickerInterval) clearInterval(autoclickerInterval);
    startAutoclicker();
}

function buyUpgrade(type) {
    if (!canPurchase(type)) return;
    const price = upgradePrices[type];
    if (Math.floor(coins) >= price && !cooldowns[type]) {
        coins -= price;
        upgradePrices[type] = Math.floor(price * 3);
        updateUI();

        switch(type) {
            case 'superClick':
                activateSuperClick();
                break;
            case 'doubleClick':
                activateDoubleClick();
                break;
            case 'multiClick':
                activateMultiClick();
                break;
            case 'goldRush':
                activateGoldRush();
                break;
        }
        saveGame();
    } else {
        alert('Недостаточно монет или активен кулдаун');
    }
}

function getActiveMultiplier() {
    let multiplierSum = multiplier;
    if (superClickActive) multiplierSum *= 10;
    if (doubleClickActive) multiplierSum *= 2;
    if (multiClickActive) multiplierSum *= 5;
    if (goldRushActive) multiplierSum *= 2;
    return multiplierSum;
}

function activateSuperClick() {
    superClickActive = true;
    startCooldown('superClick', COOLDOWN_TIMES.superClick);
    
    const startTime = Date.now();
    const button = document.getElementById('buy-superClick');
    const updateBoostTimer = () => {
        const remaining = BOOST_DURATIONS.superClick - (Date.now() - startTime);
        if (remaining <= 0) {
            clearInterval(boostTimer);
            superClickActive = false;
            updateUI();
        } else if (button) {
            button.textContent = `Действует еще ${formatTime(remaining)}`;
        }
    };
    
    const boostTimer = setInterval(updateBoostTimer, 1000);
    setTimeout(() => {
        superClickActive = false;
        updateUI();
    }, BOOST_DURATIONS.superClick);
}

function activateDoubleClick() {
    doubleClickActive = true;
    startCooldown('doubleClick', COOLDOWN_TIMES.doubleClick);
    
    const startTime = Date.now();
    const button = document.getElementById('buy-doubleClick');
    const updateBoostTimer = () => {
        const remaining = BOOST_DURATIONS.doubleClick - (Date.now() - startTime);
        if (remaining <= 0) {
            clearInterval(boostTimer);
            doubleClickActive = false;
            updateUI();
        } else if (button) {
            button.textContent = `Действует еще ${formatTime(remaining)}`;
        }
    };
    
    const boostTimer = setInterval(updateBoostTimer, 1000);
    setTimeout(() => {
        doubleClickActive = false;
        updateUI();
    }, BOOST_DURATIONS.doubleClick);
}

function activateMultiClick() {
    multiClickActive = true;
    startCooldown('multiClick', COOLDOWN_TIMES.multiClick);
    
    const startTime = Date.now();
    const button = document.getElementById('buy-multiClick');
    const updateBoostTimer = () => {
        const remaining = BOOST_DURATIONS.multiClick - (Date.now() - startTime);
        if (remaining <= 0) {
            clearInterval(boostTimer);
            multiClickActive = false;
            updateUI();
        } else if (button) {
            button.textContent = `Действует еще ${formatTime(remaining)}`;
        }
    };
    
    const boostTimer = setInterval(updateBoostTimer, 1000);
    setTimeout(() => {
        multiClickActive = false;
        updateUI();
    }, BOOST_DURATIONS.multiClick);
}

function activateGoldRush() {
    goldRushActive = true;
    multiplier *= 2;
    autoclickerSpeed *= 2;
    restartAutoclicker();
    startCooldown('goldRush', COOLDOWN_TIMES.goldRush);
    
    const startTime = Date.now();
    const button = document.getElementById('buy-goldRush');
    const updateBoostTimer = () => {
        const remaining = BOOST_DURATIONS.goldRush - (Date.now() - startTime);
        if (remaining <= 0) {
            clearInterval(boostTimer);
            goldRushActive = false;
            multiplier /= 2;
            autoclickerSpeed /= 2;
            restartAutoclicker();
            updateUI();
        } else if (button) {
            button.textContent = `Действует еще ${formatTime(remaining)}`;
        }
    };
    
    const boostTimer = setInterval(updateBoostTimer, 1000);
    setTimeout(() => {
        goldRushActive = false;
        multiplier /= 2;
        autoclickerSpeed /= 2;
        restartAutoclicker();
        updateUI();
    }, BOOST_DURATIONS.goldRush);
}

function startCooldown(type, duration) {
    cooldowns[type] = true;
    const button = document.getElementById(`buy-${type}`);
    if (button) {
        button.disabled = true;
        
        // Очищаем предыдущий таймер, если он существует
        if (cooldownTimers[type]) {
            clearInterval(cooldownTimers[type]);
        }

        const startTime = Date.now();
        const updateTimer = () => {
            const elapsed = Date.now() - startTime;
            const remaining = COOLDOWN_TIMES[type] - elapsed;
            
            if (remaining <= 0) {
                clearInterval(cooldownTimers[type]);
                cooldowns[type] = false;
                button.disabled = false;
                button.textContent = `Купить за ${upgradePrices[type]} монет`;
                cooldownTimers[type] = null;
            } else {
                button.textContent = `Доступно через ${formatTime(remaining)}`;
            }
        };

        updateTimer();
        cooldownTimers[type] = setInterval(updateTimer, 1000);
    }
}

function updateUpgradeButtons() {
    const coinsInt = Math.floor(coins);
    if (document.getElementById('buy-upgrade')) {
        document.getElementById('buy-upgrade').disabled = coinsInt < upgradePrices.baseUpgrade;
        if (elements.upgradePrice) elements.upgradePrice.textContent = upgradePrices.baseUpgrade;
    }
    if (document.getElementById('buy-autoclicker')) document.getElementById('buy-autoclicker').disabled = coinsInt < upgradePrices.autoclickerCost || autoclickerActive;
    if (document.getElementById('buy-autoclicker-upgrade')) document.getElementById('buy-autoclicker-upgrade').disabled = coinsInt < upgradePrices.autoclickerUpgradePrice || !autoclickerActive;
    if (document.getElementById('buy-super-click')) document.getElementById('buy-super-click').disabled = coinsInt < upgradePrices.superClick || cooldowns.superClick;
    if (document.getElementById('buy-double-click')) document.getElementById('buy-double-click').disabled = coinsInt < upgradePrices.doubleClick || cooldowns.doubleClick;
    if (document.getElementById('buy-multi-click')) document.getElementById('buy-multi-click').disabled = coinsInt < upgradePrices.multiClick || cooldowns.multiClick;
    if (document.getElementById('buy-gold-rush')) document.getElementById('buy-gold-rush').disabled = coinsInt < upgradePrices.goldRush || cooldowns.goldRush;

    if (elements.autoclickerUpgradePrice) {
        elements.autoclickerUpgradePrice.textContent = upgradePrices.autoclickerUpgradePrice;
    }

    const tempUpgrades = ['superClick', 'doubleClick', 'multiClick', 'goldRush'];
    tempUpgrades.forEach(type => {
        const button = document.getElementById(`buy-${type}`);
        if (button && !cooldowns[type]) {
            button.textContent = `Купить за ${upgradePrices[type]} монет`;
        }
    });
}

function checkAchievements() {
    const coinsInt = Math.floor(coins);
    if (coinsInt >= 100 && !achievements.includes("100 монет")) {
        achievements.push("100 монет");
        showAchievement("100 монет");
    }
    if (coinsInt >= 1000 && !achievements.includes("1000 монет")) {
        achievements.push("1000 монет");
        showAchievement("1000 монет");
    }
}

function showAchievement(name) {
    if (elements.achievementList) {
        const li = document.createElement('li');
        li.textContent = name;
        li.classList.add('achievement-unlocked');
        elements.achievementList.appendChild(li);
    }
}

function setDesign(index) {
    document.body.classList.remove(...designClasses);
    currentDesign = index;
    document.body.classList.add(designClasses[currentDesign]);
    saveGame();
}

// Делаем функцию setDesign доступной в глобальной области
window.setDesign = setDesign;

// Функция для обновления доступных стилей
function updateAvailableDesigns() {
    const designButtons = document.querySelectorAll('#design-options button');
    designButtons.forEach((button, index) => {
        if (index <= rebirths) {
            button.style.display = 'block';
        } else {
            button.style.display = 'none';
        }
    });
}

function rebirth() {
    if (Math.floor(coins) >= rebirthCost) {
        // Сохраняем текущий дизайн
        const currentDesignSaved = currentDesign;

        // Сбрасываем прогресс, сохраняя некоторые значения
        coins = 0;
        multiplier = 1 + (rebirths * 0.1); // Устанавливаем множитель как 1 плюс 0.1 за каждое перерождение
        level = 1;
        levelProgress = 0;
        levelUpThreshold = 100;
        autoclickerActive = false;
        autoclickerSpeed = 1;

        // Увеличиваем счетчик перерождений и стоимость
        rebirths += 1;
        rebirthCost *= 10;

        // Сбрасываем цены улучшений
        upgradePrices = {
            baseUpgrade: 10,
            autoclickerCost: 50,
            autoclickerUpgradePrice: 100,
            superClick: 500,
            doubleClick: 800,
            multiClick: 1000,
            goldRush: 1500
        };

        // Сбрасываем временные улучшения
        superClickActive = false;
        doubleClickActive = false;
        multiClickActive = false;
        goldRushActive = false;
        cooldowns = { superClick: false, doubleClick: false, multiClick: false, goldRush: false };

        // Останавливаем автокликер
        if (autoclickerInterval) {
            clearInterval(autoclickerInterval);
            autoclickerInterval = null;
        }

        // Обновляем количество доступных дизайнов
        unlockedDesigns = Math.min(rebirths + 1, designClasses.length);

        // Возвращаем прежний дизайн
        currentDesign = currentDesignSaved;
        document.body.classList.remove(...designClasses);
        document.body.classList.add(designClasses[currentDesign]);

        // Показываем кнопку автокликера снова
        document.getElementById('buy-autoclicker').style.display = 'block';

        updateUI();
        saveGame();
    } else {
        alert('Недостаточно монет для перерождения!');
    }
}

function saveCooldowns() {
    const cooldownStates = {};
    const now = Date.now();
    
    for (const type in cooldowns) {
        if (cooldowns[type]) {
            const button = document.getElementById(`buy-${type}`);
            if (button && button.disabled) {
                // Находим оставшееся время из текста кнопки
                const timeText = button.textContent.match(/(\d+):(\d+)/);
                if (timeText) {
                    const [, minutes, seconds] = timeText;
                    const remaining = (parseInt(minutes) * 60 + parseInt(seconds)) * 1000;
                    cooldownStates[type] = now + remaining;
                }
            }
        }
    }
    
    localStorage.setItem('cooldowns', JSON.stringify(cooldownStates));
}

function saveGame() {
    const gameData = {
        coins,
        multiplier,
        level,
        levelProgress,
        levelUpThreshold,
        rebirths,
        rebirthCost,
        autoclickerActive,
        autoclickerSpeed,
        upgradePrices,
        achievements,
        currentDesign,
        unlockedDesigns
    };
    localStorage.setItem('gameData', JSON.stringify(gameData));
    saveCooldowns();
}

function restoreCooldowns() {
    const now = Date.now();
    const savedCooldowns = JSON.parse(localStorage.getItem('cooldowns') || '{}');
    
    for (const [type, endTime] of Object.entries(savedCooldowns)) {
        if (endTime > now) {
            const remaining = endTime - now;
            startCooldown(type, remaining);
        }
    }
}

function loadGame() {
    const savedData = localStorage.getItem('gameData');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            coins = data.coins || 0;
            multiplier = data.multiplier || 1.0;
            level = data.level || 1;
            levelProgress = data.levelProgress || 0;
            levelUpThreshold = data.levelUpThreshold || 100;
            rebirths = data.rebirths || 0;
            rebirthCost = data.rebirthCost || 100000000;
            autoclickerActive = data.autoclickerActive || false;
            autoclickerSpeed = data.autoclickerSpeed || 1;
            upgradePrices = data.upgradePrices || upgradePrices;
            achievements = data.achievements || [];
            currentDesign = data.currentDesign || 0;
            unlockedDesigns = Math.min(rebirths + 1, designClasses.length);
            if (autoclickerActive) startAutoclicker();
            document.body.classList.add(designClasses[currentDesign]);
            updateUI();
            updateAvailableDesigns();
            restoreCooldowns();
            fetchLeaderboard();
        } catch (e) {
            console.error('Ошибка загрузки данных:', e);
            alert('Ошибка загрузки данных. Прогресс будет сброшен.');
            resetProgress();
        }
    }
}

function resetProgress() {
    // Сохраняем идентификационные данные
    const savedPlayerName = localStorage.getItem('playerName');
    const savedPlayerId = localStorage.getItem('playerId');

    coins = 0;
    multiplier = 1.0;
    level = 1;
    levelProgress = 0;
    levelUpThreshold = 100;
    rebirths = 0;
    rebirthCost = 100000000;
    achievements = [];
    autoclickerActive = false;
    autoclickerSpeed = 1;
    currentDesign = 0;
    unlockedDesigns = 1;
    superClickActive = false;
    doubleClickActive = false;
    multiClickActive = false;
    goldRushActive = false;
    cooldowns = { superClick: false, doubleClick: false, multiClick: false, goldRush: false };
    upgradePrices = {
        baseUpgrade: 10,
        autoclickerCost: 50,
        autoclickerUpgradePrice: 100,
        superClick: 500,
        doubleClick: 800,
        multiClick: 1000,
        goldRush: 1500
    };

    if (autoclickerInterval) clearInterval(autoclickerInterval);
    document.body.classList.remove(...designClasses);
    document.body.classList.add(designClasses[0]);

    // Очищаем только игровые данные
    localStorage.clear();

    // Восстанавливаем идентификационные данные
    if (savedPlayerName) localStorage.setItem('playerName', savedPlayerName);
    if (savedPlayerId) localStorage.setItem('playerId', savedPlayerId);

    const buyAutoclickerBtn = document.getElementById('buy-autoclicker');
    if (buyAutoclickerBtn) {
        buyAutoclickerBtn.style.display = 'inline-block';
    }

    updateUI();
}

window.addEventListener("beforeunload", saveGame);
window.addEventListener("load", loadGame);