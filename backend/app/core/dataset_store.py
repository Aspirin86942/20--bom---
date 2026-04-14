class DatasetStore:
    def __init__(self) -> None:
        self._store: dict[str, dict[str, object]] = {}

    def save(self, dataset_id: str, payload: dict[str, object]) -> None:
        self._store[dataset_id] = payload

    def get(self, dataset_id: str) -> dict[str, object]:
        return self._store[dataset_id]


dataset_store = DatasetStore()
