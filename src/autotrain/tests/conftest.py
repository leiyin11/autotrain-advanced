"""
Stub out heavy dependencies (torch, accelerate, transformers, huggingface_hub)
so param-validation and parser tests can run in lightweight CI environments
that don't have a full ML stack installed.
"""
import sys
import types


def _make_module(name, **attrs):
    mod = types.ModuleType(name)
    mod.__dict__.update(attrs)
    return mod


def _stub_torch():
    dynamo = _make_module("torch._dynamo")
    dynamo.config = types.SimpleNamespace(suppress_errors=False)
    torch_mod = _make_module("torch", _dynamo=dynamo, __version__="stub")
    sys.modules.setdefault("torch", torch_mod)
    sys.modules.setdefault("torch._dynamo", dynamo)


def _stub_accelerate():
    ps = types.SimpleNamespace(process_index=0)
    PartialState = lambda: ps
    acc = _make_module("accelerate", PartialState=PartialState)
    acc_state = _make_module("accelerate.state", PartialState=PartialState)
    acc.__path__ = []  # make it look like a package
    sys.modules.setdefault("accelerate", acc)
    sys.modules.setdefault("accelerate.state", acc_state)


def _stub_transformers():
    tr = _make_module(
        "transformers",
        TrainerCallback=object,
        TrainerControl=object,
        TrainerState=object,
        TrainingArguments=object,
    )
    sys.modules.setdefault("transformers", tr)


def _stub_huggingface_hub():
    class _Api:
        def __init__(self, **kw):
            pass
    hub = _make_module("huggingface_hub", HfApi=_Api)
    sys.modules.setdefault("huggingface_hub", hub)


def _stub_pandas():
    pd_mod = _make_module("pandas")
    pd_mod.DataFrame = object
    pd_mod.read_csv = lambda *a, **kw: None
    sys.modules.setdefault("pandas", pd_mod)


def _stub_datasets():
    ds = _make_module("datasets")
    ds.load_dataset = lambda *a, **kw: None
    sys.modules.setdefault("datasets", ds)


def _stub_preprocessors():
    dreambooth = _make_module("autotrain.preprocessor.dreambooth", DreamboothPreprocessor=object)
    tabular = _make_module(
        "autotrain.preprocessor.tabular",
        TabularBinaryClassificationPreprocessor=object,
        TabularMultiClassClassificationPreprocessor=object,
        TabularMultiColumnRegressionPreprocessor=object,
        TabularMultiLabelClassificationPreprocessor=object,
        TabularSingleColumnRegressionPreprocessor=object,
    )
    text = _make_module(
        "autotrain.preprocessor.text",
        LLMPreprocessor=object,
        SentenceTransformersPreprocessor=object,
        Seq2SeqPreprocessor=object,
        TextBinaryClassificationPreprocessor=object,
        TextMultiClassClassificationPreprocessor=object,
        TextSingleColumnRegressionPreprocessor=object,
        TextTokenClassificationPreprocessor=object,
    )
    vision = _make_module(
        "autotrain.preprocessor.vision",
        ImageClassificationPreprocessor=object,
        ImageRegressionPreprocessor=object,
        ObjectDetectionPreprocessor=object,
    )
    preprocessor_pkg = _make_module("autotrain.preprocessor")
    preprocessor_pkg.__path__ = []
    sys.modules.setdefault("autotrain.preprocessor", preprocessor_pkg)
    sys.modules.setdefault("autotrain.preprocessor.dreambooth", dreambooth)
    sys.modules.setdefault("autotrain.preprocessor.tabular", tabular)
    sys.modules.setdefault("autotrain.preprocessor.text", text)
    sys.modules.setdefault("autotrain.preprocessor.vision", vision)


_stub_torch()
_stub_accelerate()
_stub_transformers()
_stub_huggingface_hub()
_stub_pandas()
_stub_datasets()
_stub_preprocessors()
