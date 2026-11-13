from podpalto_tools.web.page_text import html_to_text


def test_html_to_text_strips_markup_and_scripts():
    html = (
        "<html><head><title>x</title></head>"
        "<body><h1>Hi</h1><script>var a=1</script><p>there</p></body></html>"
    )
    assert html_to_text(html) == "Hi\nthere"
