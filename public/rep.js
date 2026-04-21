// Элементы
const filtersWindow = document.getElementById('filtersWindow');
const filterBtn = document.querySelector('.filter-btn');
const closeFilters = document.getElementById('closeFilters');
const applyFilters = document.getElementById('applyFilters');
const resetFilters = document.getElementById('resetFilters');
const subjectCheckboxes = document.querySelectorAll('input[name="subject"]');

// Переменная для хранения выбранных фильтров
let selectedSubjects = Array.from(subjectCheckboxes).filter(checkbox => checkbox.checked).map(checkbox => checkbox.value);

// Показать/скрыть окно фильтров
filterBtn.addEventListener('click', function() {
    filtersWindow.classList.toggle('show');
});

// Закрыть окно фильтров
closeFilters.addEventListener('click', function() {
    filtersWindow.classList.remove('show');
});

// Закрыть окно при клике вне его
document.addEventListener('click', function(event) {
    if (!filtersWindow.contains(event.target) && event.target !== filterBtn) {
        filtersWindow.classList.remove('show');
    }
});

// Применить фильтры
applyFilters.addEventListener('click', function() {
    selectedSubjects = Array.from(subjectCheckboxes).filter(checkbox => checkbox.checked).map(checkbox => checkbox.value);
    updateDisplay();
    filtersWindow.classList.remove('show');
});

// Сбросить фильтры
resetFilters.addEventListener('click', function() {
    subjectCheckboxes.forEach(checkbox => checkbox.checked = true);
    selectedSubjects = Array.from(subjectCheckboxes).map(checkbox => checkbox.value);
    updateDisplay();
    filtersWindow.classList.remove('show');
});

// Функция updateDisplay теперь учитывает и поиск, и фильтры
function updateDisplay() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    let hasResults = false;

    videoCards.forEach(card => {
        const title = card.getAttribute('data-title').toLowerCase();
        const subject = card.getAttribute('data-subject');
        const matchesSearch = title.includes(searchTerm) || subject.toLowerCase().includes(searchTerm);
        const matchesFilter = selectedSubjects.includes(subject);

        if (matchesSearch && matchesFilter) {
            card.classList.remove('hidden');
            hasResults = true;
        } else {
            card.classList.add('hidden');
        }
    });

    if (hasResults) {
        noResults.classList.remove('show');
    } else {
        noResults.classList.add('show');
    }
}

// Теперь при поиске также вызываем updateDisplay
searchInput.addEventListener('input', function() {
    updateDisplay();
});

searchInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        updateDisplay();
    }
});

searchBtn.addEventListener('click', updateDisplay);