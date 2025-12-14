<nav>
	<p><a href="/">clayproto/</a></p>
	<nav>
		<p>about</p>
	</nav>
</nav>

<p>
	This is an experiment with AT Proto around the idea that you we want to write data to a place you
	own and can take with you.
</p>
<p>
	Usually a developer defines and publishes a <em>lexicon</em>, which allows users to sign in to
	their app and manage their items. You can imagine, for example, a "My bookmarks app" where you can
	add bookmarks, stored in atproto. All well and good, but it requires a developer to have built it
	for you.
</p>
<p>
	Clayproto turns this around: you define the shape of your data as a "schema" and store it inside a
	regular <em>clayproto.schema</em> record. I'm building this to see if it is stupid, or a good idea.
	The advantage is that people can create as many schemas as they want without having to touch any code.
	Schemas and their records can be freely edited. Once you've defined your schemas, technically you don't
	need Clayproto any longer. This is a good thing.
</p>
<p>
	Now, by not using lexicons and sticking your schema inside a lexison, you lose discoverability and
	(what else? prob more) but this might not matter for your personal data. You gain freedom to click
	together schemas, crud data and persist it in your account. Portable data.
</p>
