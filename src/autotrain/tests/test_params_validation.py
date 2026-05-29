import os
import tempfile

import pytest
import yaml
from pydantic import ValidationError

from autotrain.trainers.clm.params import LLMTrainingParams
from autotrain.trainers.seq2seq.params import Seq2SeqParams
from autotrain.trainers.tabular.params import TabularParams


def _llm(**overrides):
    p = {"model": "gpt2", "project_name": "test-project", "data_path": "data"}
    p.update(overrides)
    return p


def _seq2seq(**overrides):
    p = {"model": "google/flan-t5-base", "project_name": "test-project", "data_path": "data"}
    p.update(overrides)
    return p


def _tabular(**overrides):
    p = {"data_path": "data", "project_name": "test-project"}
    p.update(overrides)
    return p


# ---------------------------------------------------------------------------
# LLMTrainingParams
# ---------------------------------------------------------------------------

class TestLLMTrainingParams:
    def test_valid_defaults(self):
        p = LLMTrainingParams(**_llm())
        assert p.lr == 3e-5
        assert p.epochs == 1
        assert p.batch_size == 2
        assert p.gradient_accumulation == 4
        assert p.warmup_ratio == 0.1

    @pytest.mark.parametrize("lr", [0, -0.001, -1e-10])
    def test_invalid_lr_raises(self, lr):
        with pytest.raises(ValidationError, match="lr must be greater than 0"):
            LLMTrainingParams(**_llm(lr=lr))

    @pytest.mark.parametrize("epochs", [0, -1, -100])
    def test_invalid_epochs_raises(self, epochs):
        with pytest.raises(ValidationError, match="epochs must be greater than 0"):
            LLMTrainingParams(**_llm(epochs=epochs))

    @pytest.mark.parametrize("batch_size", [0, -1, -32])
    def test_invalid_batch_size_raises(self, batch_size):
        with pytest.raises(ValidationError, match="batch_size must be greater than 0"):
            LLMTrainingParams(**_llm(batch_size=batch_size))

    @pytest.mark.parametrize("grad_acc", [0, -1, -4])
    def test_invalid_gradient_accumulation_raises(self, grad_acc):
        with pytest.raises(ValidationError, match="gradient_accumulation must be greater than 0"):
            LLMTrainingParams(**_llm(gradient_accumulation=grad_acc))

    @pytest.mark.parametrize("warmup", [1.0, 1.5, -0.1])
    def test_invalid_warmup_ratio_raises(self, warmup):
        with pytest.raises(ValidationError, match="warmup_ratio must be in"):
            LLMTrainingParams(**_llm(warmup_ratio=warmup))

    def test_warmup_ratio_zero_is_valid(self):
        p = LLMTrainingParams(**_llm(warmup_ratio=0.0))
        assert p.warmup_ratio == 0.0

    def test_warmup_ratio_just_below_one_is_valid(self):
        p = LLMTrainingParams(**_llm(warmup_ratio=0.999))
        assert p.warmup_ratio == 0.999

    def test_project_name_with_spaces_raises(self):
        with pytest.raises(ValueError, match="alphanumeric"):
            LLMTrainingParams(**_llm(project_name="bad name"))

    def test_project_name_too_long_raises(self):
        with pytest.raises(ValueError, match="50 characters"):
            LLMTrainingParams(**_llm(project_name="a" * 51))

    def test_project_name_with_hyphens_is_valid(self):
        p = LLMTrainingParams(**_llm(project_name="my-llm-run"))
        assert p.project_name == "my-llm-run"


# ---------------------------------------------------------------------------
# Seq2SeqParams
# ---------------------------------------------------------------------------

class TestSeq2SeqParams:
    def test_valid_defaults(self):
        p = Seq2SeqParams(**_seq2seq())
        assert p.lr == 5e-5
        assert p.epochs == 3
        assert p.batch_size == 2

    @pytest.mark.parametrize("lr", [0, -1e-5])
    def test_invalid_lr_raises(self, lr):
        with pytest.raises(ValidationError, match="lr must be greater than 0"):
            Seq2SeqParams(**_seq2seq(lr=lr))

    @pytest.mark.parametrize("epochs", [0, -3])
    def test_invalid_epochs_raises(self, epochs):
        with pytest.raises(ValidationError, match="epochs must be greater than 0"):
            Seq2SeqParams(**_seq2seq(epochs=epochs))

    @pytest.mark.parametrize("batch_size", [0, -8])
    def test_invalid_batch_size_raises(self, batch_size):
        with pytest.raises(ValidationError, match="batch_size must be greater than 0"):
            Seq2SeqParams(**_seq2seq(batch_size=batch_size))

    def test_invalid_gradient_accumulation_raises(self):
        with pytest.raises(ValidationError, match="gradient_accumulation must be greater than 0"):
            Seq2SeqParams(**_seq2seq(gradient_accumulation=0))

    def test_invalid_warmup_ratio_raises(self):
        with pytest.raises(ValidationError, match="warmup_ratio must be in"):
            Seq2SeqParams(**_seq2seq(warmup_ratio=1.0))


# ---------------------------------------------------------------------------
# TabularParams
# ---------------------------------------------------------------------------

class TestTabularParams:
    def test_valid_defaults(self):
        p = TabularParams(**_tabular())
        assert p.num_trials == 10
        assert p.time_limit == 600

    @pytest.mark.parametrize("num_trials", [0, -1, -100])
    def test_invalid_num_trials_raises(self, num_trials):
        with pytest.raises(ValidationError, match="num_trials must be greater than 0"):
            TabularParams(**_tabular(num_trials=num_trials))

    @pytest.mark.parametrize("time_limit", [0, -1, -600])
    def test_invalid_time_limit_raises(self, time_limit):
        with pytest.raises(ValidationError, match="time_limit must be greater than 0"):
            TabularParams(**_tabular(time_limit=time_limit))

    def test_positive_values_accepted(self):
        p = TabularParams(**_tabular(num_trials=1, time_limit=1))
        assert p.num_trials == 1
        assert p.time_limit == 1


# ---------------------------------------------------------------------------
# AutoTrainConfigParser — _parse_config robustness
# ---------------------------------------------------------------------------

def _write_yaml(data, path):
    with open(path, "w") as f:
        yaml.dump(data, f)


def _minimal_config(**overrides):
    cfg = {
        "task": "llm",
        "backend": "local",
        "base_model": "gpt2",
        "project_name": "test-project",
        "data": {
            "path": "data/",
            "train_split": "train",
            "valid_split": None,
        },
        "log": "none",
    }
    cfg.update(overrides)
    return cfg


class TestConfigParser:
    def test_missing_base_model_raises(self):
        from autotrain.parser import AutoTrainConfigParser

        cfg = _minimal_config()
        del cfg["base_model"]
        with tempfile.NamedTemporaryFile(suffix=".yaml", mode="w", delete=False) as f:
            yaml.dump(cfg, f)
            path = f.name
        try:
            with pytest.raises(ValueError, match="base_model is required"):
                AutoTrainConfigParser(config_path=path)
        finally:
            os.unlink(path)

    def test_missing_project_name_raises(self):
        from autotrain.parser import AutoTrainConfigParser

        cfg = _minimal_config()
        del cfg["project_name"]
        with tempfile.NamedTemporaryFile(suffix=".yaml", mode="w", delete=False) as f:
            yaml.dump(cfg, f)
            path = f.name
        try:
            with pytest.raises(ValueError, match="project_name is required"):
                AutoTrainConfigParser(config_path=path)
        finally:
            os.unlink(path)

    def test_missing_chat_template_does_not_crash(self):
        from autotrain.parser import AutoTrainConfigParser

        cfg = _minimal_config()
        # Explicitly no chat_template key in data
        cfg["data"] = {"path": "data/", "train_split": "train", "valid_split": None}
        with tempfile.NamedTemporaryFile(suffix=".yaml", mode="w", delete=False) as f:
            yaml.dump(cfg, f)
            path = f.name
        try:
            parser = AutoTrainConfigParser(config_path=path)
            assert parser.parsed_config.get("chat_template") is None
        finally:
            os.unlink(path)

    def test_missing_column_mapping_does_not_crash(self):
        from autotrain.parser import AutoTrainConfigParser

        cfg = _minimal_config()
        cfg["data"] = {"path": "data/", "train_split": "train", "valid_split": None}
        with tempfile.NamedTemporaryFile(suffix=".yaml", mode="w", delete=False) as f:
            yaml.dump(cfg, f)
            path = f.name
        try:
            # Should not raise KeyError
            AutoTrainConfigParser(config_path=path)
        finally:
            os.unlink(path)
