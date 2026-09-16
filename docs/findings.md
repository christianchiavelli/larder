# Findings

Bugs worth writing down, all of the same kind: nothing raised, nothing failed,
and the page looked right. Most came from upstream disagreeing with itself; the
rest were ours.

Each is also documented at the point in the code where it matters, and the
contracts they were found against are in [`upstream-api.md`](upstream-api.md).

---

**The query parser fails silently.** Upstream parses `q` as a Lucene expression.
Unescaped input does not raise an error, it changes meaning and returns zero
matches. A product whose name contains a colon would appear not to exist, with
nothing saying why. Values are escaped the way SQL values are, in
`server/utils/lucene.ts`, and the injection case is under test.

**Tailwind was not scanning the layer.** Class names are discovered from the
Vite root, which Nuxt sets to the app directory, so everything under `layers/`
fell outside the scan and every utility used only in the design system was never
generated. `bg-nutri-a` computed to transparent while `bg-surface-raised`, which
the app also used, was fine. The class was in the markup, the token resolved,
the build succeeded, and lint, types and the unit suite all passed. Fixed with
an explicit `@source`, and `e2e/design-tokens.spec.ts` now asserts the utilities
resolve in a real browser.

**Two numbers describing different populations.** Elasticsearch stops tracking
hits at 10,000 but still aggregates over every matching document, so `count` is
a ceiling while facet counts are real totals. The overview was reading one for
its headline and the other for its charts, putting 10,000 and 3.5 million on one
screen as if they measured the same thing. The directory renders an inexact
total as "10,000+" for the same reason.

**"Other" is not a category.** The facet response includes a `--other--`
remainder bucket holding the long tail. It cannot be filtered on, and being a
sum it outweighs every real value. Left in, the category chart reported Other as
the largest category of food in the world, at six million products.

**The two services disagree about names.** Barcode `3274080005003` is "Eau de
source" in the search index, "Cristaline" in the product API, and carries
"isabelle" in a third field. A directory card and the page it opens are allowed
to differ. Picking "whichever looks most like a product name" is a heuristic
over vandalism, so one rule is applied consistently, the divergence is
documented, and the end-to-end test asserts the barcode instead of the heading.

**Zod 4 needs the key to be present.** Upstream omits a key entirely when it has
no value, and a union that merely includes `z.undefined()` still requires the
key. Every record missing any optional field was rejected, which is most of the
catalogue: the directory rendered empty while reporting 10,000 matches. Found by
writing the test with a fixture copied from a real response instead of an
invented one.

**Upstream's multi-taxonomy autocomplete is unusable.** `/autocomplete` accepts
a list of taxonomies, and ranks the whole list together, so the highest-scoring
one fills the response: "choc" across categories, brands and labels comes back
as eight brands and no category at all. The BFF issues one call per taxonomy and
interleaves them with a quota, which is why the search box can suggest a
category and a brand in the same list.

**The ungraded bucket could not be filtered, and filtering by it returned
everything.** "No Nutri-Score" is the largest thing in the catalogue, larger
than every grade combined, and the query schema dropped it as an invalid value.
A dropped filter narrows nothing, so the request came back as the whole
unfiltered catalogue: the control read as applied and the results were of
everything.

The first fix made it one value that expanded into the index's two keys, which
was right about the population and wrong about the question. `unknown` and
`not-applicable` are different facts, the boundary was flattening one into the
other, and nothing downstream could recover the difference: a reader looking for
products that ought to carry a grade got every beer and vinegar mixed in. The
distinction is preserved from the upstream mapping through to the badge now, and
each is a filter of its own.

**Escaping a hyphen made a filter match nothing.** Enum values went through the
free-text escaper, which escapes `-` because it is Lucene's NOT operator. It
only is at the start of a term, and `nutriscore_grade:not\-applicable` matches
zero documents. Every grade until then had been a single letter, so the escaper
had never had a character to get wrong. The failure also hid: at the time that
clause was OR'd with one exceeding the tracked ceiling on its own, so the count
would have read the same with seventy-one thousand products missing. Enum values
are quoted now, as taxonomy ids already were, and the value is reachable on its
own, where the same bug would empty the page instead of hiding in a total.

**Three quarters of the catalogue could not be filtered for processing.** The
NOVA filter offered groups 1 to 4, which is every value the facet returns, and
2,642,203 products carry no group at all. Unlike a missing Nutri-Score this
absence is not a value: the field is simply not there, so there is no bucket to
select and the only query that reaches those products is a negation. The filter
has a fifth control that issues one, checked against upstream rather than
assumed, because a negated clause inside an OR is where Lucene parsers differ:
among balsamic vinegars, group 2 returns 1,483, the absence 71, and the two
together 1,554.

**A headline read the size of a facet page and called it a statistic.**
"Categories represented: 10" was `facets.categories_tags.length`, which is ten
for every query and would be ten for one that matched nothing. It reports the
share of the catalogue carrying a NOVA group instead, which is a number that
moves and that the filter beside it can act on.

**Brands are stored differently from every other dimension.** The categories,
countries and labels facets return language-prefixed ids (`en:beverages`), the
brands facet returns a bare slug (`carrefour`), and autocomplete prefixes all of
them. So a brand suggestion arrived as `en:olivari`, matched nothing, and the
directory showed an applied filter over an empty catalogue: the worst shape this
can take, because the reasonable conclusion is that the brand has no products.
Normalised where the query is parsed, so a suggestion, a shared link and a
hand-edited URL all agree.

The end-to-end test for suggestions passed throughout. It asserted that the URL
changed, which was true. It now asserts that something comes back.

**Filters could not be switched off.** The URL writer merged two serialised
queries, and the serialiser omits anything at its default, including an empty
list. A patch that emptied a dimension carried no key for it, so the old value
survived the merge. Applying a filter worked; unchecking one did nothing, and
neither did Clear all. Every test applied a filter and none removed one, so the
suite stayed green.
