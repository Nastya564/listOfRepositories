class RepositoriesSearch {
    constructor() {
        this.searchInput = document.getElementById('search-input');
        this.autocompleteList = document.getElementById('autocomplete-list');
        this.repositoriesList = document.getElementById('repositories-list');
        this.repositories = [];
        this.debounceTimeout = null;
        this.abortController = null;

        this.init();
    }

    init() {
        this.searchInput.addEventListener('input', this.handleInput.bind(this));
        this.searchInput.addEventListener('focus', this.handleFocus.bind(this));
        document.addEventListener('click', this.handleClickOutside.bind(this));
    }

    handleInput() {
        const query = this.searchInput.value.trim();

        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        if (!query) {
            this.clearAutocomplete();
            return;
        }

        this.debounceTimeout = setTimeout(() => {
            this.searchRepositories(query);
        }, 300);
    }

    handleFocus() {
        if (this.searchInput.value.trim()) {
            this.searchRepositories(this.searchInput.value.trim());
        }
    }

    handleClickOutside(event) {
        if (!event.target.closest('.search-container')) {
            this.clearAutocomplete();
        }
    }

    async searchRepositories(query) {
        if (this.abortController) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();

        try {
            this.showLoading();
            
            const response = await fetch(
                `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=5`,
                {
                    signal: this.abortController.signal,
                    headers: {
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Ошибка при загрузке данных');
            }

            const data = await response.json();
            this.showAutocomplete(data.items);
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }
            this.showError(error.message);
        } finally {
            this.abortController = null;
        }
    }

    showLoading() {
        this.autocompleteList.innerHTML = '<div class="loading">Загрузка...</div>';
    }

    showError(message) {
        this.autocompleteList.innerHTML = `<div class="error-message">${message}</div>`;
    }

    showAutocomplete(repositories) {
        if (!repositories || repositories.length === 0) {
            this.autocompleteList.innerHTML = '<div class="autocomplete-item">Ничего не найдено</div>';
            return;
        }

        this.autocompleteList.innerHTML = repositories.map(repo => `
            <div class="autocomplete-item" data-repo-id="${repo.id}">
                <div class="repo-name">${repo.full_name}</div>
                <div class="repo-details">
                    <span>👤 ${repo.owner.login}</span>
                    <span>⭐ ${repo.stargazers_count}</span>
                </div>
            </div>
        `).join('');

        this.autocompleteList.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const repoId = parseInt(item.dataset.repoId);
                const selectedRepo = repositories.find(r => r.id === repoId);
                if (selectedRepo) {
                    this.addRepository(selectedRepo);
                }
            });
        });
    }

    clearAutocomplete() {
        this.autocompleteList.innerHTML = '';
    }

    addRepository(repo) {
        if (!this.repositories.some(r => r.id === repo.id)) {
            this.repositories.push(repo);
            this.renderRepositories();
        }
        
        this.searchInput.value = '';
        this.clearAutocomplete();
    }

    removeRepository(repoId) {
        this.repositories = this.repositories.filter(repo => repo.id !== repoId);
        this.renderRepositories();
    }

    renderRepositories() {
        if (this.repositories.length === 0) {
            this.repositoriesList.innerHTML = '';
            return;
        }

        this.repositoriesList.innerHTML = this.repositories.map(repo => `
            <div class="repository-item" data-repo-id="${repo.id}">
                <div class="repo-info">
                    <h3>${repo.full_name}</h3>
                    <p>Владелец: ${repo.owner.login}</p>
                    <p class="stars">⭐ Звезд: ${repo.stargazers_count}</p>
                </div>
                <button class="delete-btn" data-repo-id="${repo.id}">Удалить</button>
            </div>
        `).join('');

        this.repositoriesList.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', () => {
                const repoId = parseInt(button.dataset.repoId);
                this.removeRepository(repoId);
            });
        });
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new RepositoriesSearch();
});
