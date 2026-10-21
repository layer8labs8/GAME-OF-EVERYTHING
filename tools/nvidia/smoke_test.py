"""One streaming request to confirm the key and the endpoint work."""
from client import make_client

MODEL = "nvidia/nemotron-3-ultra-550b-a55b"

stream = make_client().chat.completions.create(
    model=MODEL,
    messages=[{"role": "user", "content": "Write a limerick about the wonders of GPU computing."}],
    temperature=1,
    top_p=0.95,
    max_tokens=2048,
    extra_body={"chat_template_kwargs": {"enable_thinking": True}},
    stream=True,
)

for chunk in stream:
    if not chunk.choices:
        continue
    delta = chunk.choices[0].delta
    reasoning = getattr(delta, "reasoning_content", None)
    if reasoning:
        print(reasoning, end="")
    if delta.content is not None:
        print(delta.content, end="")
print()
